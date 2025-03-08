import { NextRequest, NextResponse } from "next/server";
import {
  PollyClient,
  SynthesizeSpeechCommand,
  OutputFormat,
  Engine,
  VoiceId,
} from "@aws-sdk/client-polly";
import { createClient } from "@/lib/supabase/server";
import { Readable } from "stream";

// AWS Polly client
const pollyClient = new PollyClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // Synthesize speech using Amazon Polly
    const command = new SynthesizeSpeechCommand({
      Text: text,
      OutputFormat: OutputFormat.MP3,
      VoiceId: VoiceId.Thiago, // Brazilian Portuguese female voice
      Engine: Engine.NEURAL,
    });

    const { AudioStream } = await pollyClient.send(command);

    if (!AudioStream) {
      return NextResponse.json(
        { error: "Failed to synthesize speech" },
        { status: 500 }
      );
    }

    // Convert AudioStream to Buffer
    const chunks: Uint8Array[] = [];
    const readable = AudioStream as Readable;

    for await (const chunk of readable) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    // Return audio as response
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": "attachment; filename=speech.mp3",
      },
    });
  } catch (error) {
    console.error("Error synthesizing speech:", error);
    return NextResponse.json(
      { error: "Failed to synthesize speech" },
      { status: 500 }
    );
  }
}
