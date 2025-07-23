import { AssemblyAI } from 'assemblyai';

const client = new AssemblyAI({
  apiKey: process.env.ASSEMBLYAI_API_KEY
});

export async function GET() {
  try {
    const { token } = await client.realtime.createTemporaryToken({ expires_in: 300 });
    return Response.json({ token });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
} 