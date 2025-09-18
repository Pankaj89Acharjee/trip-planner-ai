export type AgentResponse = {
  answer?: string;
  error?: string;
};

// Debounced version of askAgent to prevent excessive API calls
let debounceTimer: NodeJS.Timeout | null = null;
export async function askAgentDebounced(question: string, delay: number = 5000): Promise<AgentResponse> {
  return new Promise((resolve) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    debounceTimer = setTimeout(async () => {
      const result = await askAgent(question);
      resolve(result);
    }, delay);
  });
}

export async function askAgent(question: string): Promise<AgentResponse> {
  const url = process.env.NEXT_PUBLIC_AGENT_URL || "https://agentapi-clzbcargga-uc.a.run.app";
  //const url = process.env.NEXT_PUBLIC_LOCAL_AGENT_URL;
  
  if (!url) {
    return { error: "NEXT_PUBLIC_AGENT_URL environment variable is not set" };
  }

  try {
    const requestBody: any = { 
      question,
      action: 'generate' 
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const data = (await res.json()) as AgentResponse;
    if (!res.ok) {
      return { error: data.error || `Request failed with status ${res.status}` };
    }
    return data;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Network error" };
  }
}


