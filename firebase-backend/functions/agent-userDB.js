import { ToolboxClient } from '@toolbox-sdk/core'

const TOOLBOX_URL = 'https://toolbox-153773761918.us-central1.run.app';
const client = new ToolboxClient(TOOLBOX_URL);

export async function databaseAgent(action, userData) {

    const toolset = await client.loadToolset();
    const toolMap = new Map(toolset.map(t => [t.getName(), t]));

    switch (action) {
        case 'sync':
            //Direct tool call with the name
            const createUserTool = toolMap.get('create-user');
            if (!createUserTool) {
                return "MISSING_AGENT"
            }

            const result = await createUserTool({
                uid: userData.uid,
                email: userData.email,
                display_name: userData.displayName,
                photo_url: userData.photoURL,
                preferences: JSON.stringify(userData.preferences || {})
            });
            return result;

        case 'get':
            const getUserTool = toolMap.get('get-user');
            if (!getUserTool) {
                return "MISSING_AGENT"
            }

            const getUserResult = await getUserTool({
                uid: userData.uid
            });

            return getUserResult;


        default:
            return "INVALID_ACTION"
    }
}
