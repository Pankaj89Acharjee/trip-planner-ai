export type AgentResponse = {
  answer?: string;
  error?: string;
};

export async function askAgent(question: string, userUid?: string, formData?: any): Promise<AgentResponse> {
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
    
    // Adding userUid for itinerary auto-saving functionality
    if (userUid) {
      requestBody.userUid = userUid;
    }
    
    // Adding form data for auto-saving
    if (formData) {
      requestBody.formData = formData;
    }

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


