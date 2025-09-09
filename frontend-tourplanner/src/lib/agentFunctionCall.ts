export type AgentResponse = {
  answer?: string;
  error?: string;
};

export async function askAgent(question: string): Promise<AgentResponse> {
  const url = process.env.NEXT_PUBLIC_AGENT_URL || "https://agentapi-clzbcargga-uc.a.run.app";
  //const url = process.env.NEXT_PUBLIC_LOCAL_AGENT_URL;
  
  if (!url) {
    return { error: "NEXT_PUBLIC_AGENT_URL environment variable is not set" };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
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


