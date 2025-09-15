import { ToolboxClient } from '@toolbox-sdk/core'
import { DynamicStructuredTool } from '@langchain/core/tools'
import { ChatVertexAI } from '@langchain/google-vertexai'
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts'
import { createToolCallingAgent, AgentExecutor } from 'langchain/agents'
import { z } from 'zod'

const TOOLBOX_URL = 'https://toolbox-153773761918.us-central1.run.app'

// Cache to avoid reloading tools every call
let toolsetCache = null
let toolMapCache = null
let toolNamesCache = null

async function getTooling() {
  if (toolsetCache && toolMapCache && toolNamesCache) {
    return { toolset: toolsetCache, toolMap: toolMapCache, toolNames: toolNamesCache }
  }

  const client = new ToolboxClient(TOOLBOX_URL)
  const toolset = await client.loadToolset()
  const toolMap = new Map(toolset.map(t => [t.getName(), t]))
  const toolNames = toolset.map(t => t.getName())

  toolsetCache = toolset
  toolMapCache = toolMap
  toolNamesCache = toolNames

  return { toolset, toolMap, toolNames }
}

function normalizeToolArgs(toolName, args) {
  // Convert arguments for search tool
  if (toolName === 'search-hotels-by-location-and-activities') {
    // Convert interests array to comma-separated string
    if (args.interests && Array.isArray(args.interests)) {
      args.interests = args.interests.join(', ')
    }
    // Ensure budget is an integer
    if (args.budget !== undefined) {
      args.budget = parseInt(args.budget, 10)
    }
  }
  return args
}

function normalizeToolResult(toolName, args, result) {
  if (!result) return 'EMPTY_RESULT'

  let parsed = result
  if (typeof result === 'string') {
    try {
      parsed = JSON.parse(result)
    } catch {
      return result 
    }
  }


  if (args?.location) {
    const location = args.location.toLowerCase()

    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].location) {
      const filtered = parsed.filter(h => h.location?.toLowerCase() === location)

      if (filtered.length === 0) {
        return `No results found in ${args.location}`
      }
      return filtered
    }

    if (parsed.location) {
      return parsed.location.toLowerCase() === location
        ? parsed
        : `No results found in ${args.location}`
    }
  }

  return parsed
}

async function buildExecutor() {
  const { toolMap, toolNames } = await getTooling()

  const invokeToolbox = new DynamicStructuredTool({
    name: 'invoke_toolbox',
    description: `Call a toolbox tool by name with exact args. Available tools: ${toolNames.join(', ')}`,
    schema: z.object({
      toolName: z.enum(toolNames),
      args: z.record(z.any()).describe('Arguments object expected by that tool'),
    }),
    func: async ({ toolName, args }) => {
      console.log(`🔧 TOOL INVOKED: ${toolName}`)
      console.log(`📝 TOOL ARGS:`, JSON.stringify(args, null, 2))
      
      const tool = toolMap.get(toolName)
      if (!tool) {
        console.log(`❌ TOOL NOT FOUND: ${toolName}`)
        return `Unknown tool: ${toolName}`
      }

      // Validate arguments
      const schema = tool.getParamSchema?.()
      if (schema?.safeParse) {
        const parsed = schema.safeParse(args || {})
        if (!parsed.success) {
          const msg = parsed.error.issues
            .map(i => `${i.path.join('.') || '<root>'}: ${i.message}`)
            .join('; ')
          console.log(`❌ INVALID ARGS for ${toolName}:`, msg)
          return `INVALID_ARGS for ${toolName}: ${msg}`
        }
        args = parsed.data
      }

      try {
        // Normalize arguments before calling tool
        const normalizedArgs = normalizeToolArgs(toolName, args || {})
        console.log(`🔄 NORMALIZED ARGS:`, JSON.stringify(normalizedArgs, null, 2))
        
        console.log(`🚀 CALLING TOOL: ${toolName}`)
        const rawResult = await tool(normalizedArgs)
        console.log(`✅ TOOL RAW RESULT for ${toolName}:`, typeof rawResult, Array.isArray(rawResult) ? rawResult.length : 'not array')
        console.log(`📊 TOOL RAW DATA:`, JSON.stringify(rawResult, null, 2))
        
        const normalized = normalizeToolResult(toolName, normalizedArgs, rawResult)
        console.log(`🔄 TOOL NORMALIZED RESULT:`, normalized)

        return typeof normalized === 'string'
          ? normalized
          : JSON.stringify(normalized, null, 2)
      } catch (error) {
        console.error(`❌ TOOL ERROR ${toolName}:`, error)
        return `Error calling ${toolName}: ${error.message}`
      }
    },
  })

  const llm = new ChatVertexAI({
    model: 'gemini-2.5-flash',
    temperature: 0,
    project: process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GCLOUD_REGION || 'us-central1',
  })

  const prompt = ChatPromptTemplate.fromMessages([
    [
      'system',
      `You are a travel itinerary assistant. When users request travel planning:

        CRITICAL INSTRUCTIONS:
        1. ALWAYS use invoke_toolbox to search for real data from the database
        2. Generate a COMPLETE itinerary for ALL requested days
        3. 3. Return ONLY valid JSON - NO markdown, NO code blocks, NO backticks, NO explanations:

        {{
          "itinerary": [
            {{
              "day": 1,
              "accommodation": {{
                "name": "Hotel Name",
                "description": "Hotel description", 
                "costPerNight": 150,
                "location": {{"latitude": 48.8566, "longitude": 2.3522}}
              }},
              "activities": [
                {{
                  "name": "Activity Name",
                  "description": "Activity description",
                  "cost": 25,
                  "duration": 2.5,
                  "location": {{"latitude": 48.8584, "longitude": 2.2945}}
                }}
              ]
            }}
          ],
          "totalCost": 850,
          "metadata": {{
            "searchResults": {{
              "hotelsFound": 15,
              "activitiesFound": 24,
              "availableRooms": 8
            }},
            "recommendations": {{
              "bestValueHotel": "Hotel Name",
              "mustDoActivity": "Activity Name", 
              "budgetTip": "Helpful tip"
            }}
          }}
        }}

        4. If you do not find any match as per user's request, return JSON with empty itinerary and error message:
        {{
          "itinerary": [],
          "totalCost": 0,
          "metadata": {{
            "searchResults": {{"hotelsFound": 0, "activitiesFound": 0, "availableRooms": 0}},
            "recommendations": {{"error": "No matches found for your criteria. Please try a different destination, adjust your budget, or modify your interests."}}
          }}
        }}

        WORKFLOW:
        1. Parse user input (destination, days, budget, interests)
        2. MANDATORY: Call invoke_toolbox with 'search-hotels-by-location-and-activities' tool
        3. MANDATORY: Use the search results to create day-by-day itinerary
        4. Calculate total costs from the found hotels and activities
        5. Return ONLY the JSON above

        TOOL PARAMETERS (EXACT NAMES REQUIRED - NO OTHER PARAMETERS ALLOWED):
        For 'search-hotels-by-location-and-activities' tool, use ONLY these 3 parameters:
        - location_name: string (destination name)
        - budget: integer (total budget)
        - interests: string (comma-separated, e.g., "heritage, food")

        FORBIDDEN PARAMETERS (DO NOT USE): numberOfAdults, checkInDate, numberOfNights, location, maxBudget, priceRange, checkOutDate, max_budget, etc.
        ONLY USE THE 3 PARAMETERS LISTED ABOVE. NO OTHER PARAMETERS.

        CRITICAL: You MUST call invoke_toolbox first before deciding if matches exist. Do NOT return empty results without searching.
        DO NOT ask questions. DO NOT give partial responses. Generate the complete itinerary.`,
    ],
    new MessagesPlaceholder('chat_history'),
    ['human', '{input}'],
    new MessagesPlaceholder('agent_scratchpad'),
  ])

  const agent = await createToolCallingAgent({
    llm,
    tools: [invokeToolbox],
    prompt,
  })

  return new AgentExecutor({
    agent,
    tools: [invokeToolbox],
    verbose: false,
  })
}

export async function runAgent(question, context = {}) {
  const executor = await buildExecutor()
  const res = await executor.invoke({
    input: `Context: ${JSON.stringify(context)}\nUser: ${question}`,
    chat_history: [],
  })
  return res.output
}

// Optional: MCP Tool test
export async function directToolTest() {
  const { toolMap } = await getTooling()
  const t = toolMap.get('search-hotels-by-location-and-activities')
  if (!t) {
    console.log('Tool not found: search-hotels-by-location-and-activities')
    return
  }
  const out = await t({ location: 'Zurich' })
  console.log(
    'direct result:',
    typeof out,
    Array.isArray(out) ? out.length : out
  )
}