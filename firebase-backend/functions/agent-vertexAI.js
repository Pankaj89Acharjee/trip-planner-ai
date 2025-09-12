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
      const tool = toolMap.get(toolName)
      if (!tool) return `Unknown tool: ${toolName}`

      // Validate arguments
      const schema = tool.getParamSchema?.()
      if (schema?.safeParse) {
        const parsed = schema.safeParse(args || {})
        if (!parsed.success) {
          const msg = parsed.error.issues
            .map(i => `${i.path.join('.') || '<root>'}: ${i.message}`)
            .join('; ')
          return `INVALID_ARGS for ${toolName}: ${msg}`
        }
        args = parsed.data
      }

      const rawResult = await tool(args || {})
      const normalized = normalizeToolResult(toolName, args, rawResult)

      console.log('Tool result (normalized):', normalized)

      return typeof normalized === 'string'
        ? normalized
        : JSON.stringify(normalized, null, 2)
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

        WORKFLOW:
        1. Parse user input (destination, days, budget, interests)
        2. Search hotels for the destination
        3. Search activities for each interest category
        4. Create day-by-day itinerary
        5. Calculate total costs
        6. Return ONLY the JSON above

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
  const t = toolMap.get('search-hotels-by-location')
  if (!t) {
    console.log('Tool not found: search-hotels-by-location')
    return
  }
  const out = await t({ location: 'Zurich' })
  console.log(
    'direct result:',
    typeof out,
    Array.isArray(out) ? out.length : out
  )
}