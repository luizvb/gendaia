import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { createClient } from "@/lib/supabase/server";
import { createClient as createDeepgramClient } from "@deepgram/sdk";

// AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

// Deepgram client
const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get form data with audio file
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const userId = session.user.id;
    const filename = `audio-${userId}-${timestamp}.webm`;
    const s3Key = `audio-uploads/${filename}`;

    // Get audio buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3 for storage
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME || "luizai",
        Key: s3Key,
        Body: buffer,
        ContentType: audioFile.type,
      })
    );

    // Transcribe using Deepgram with direct buffer
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      buffer,
      {
        model: "nova-2",
        smart_format: true,
        language: "pt",
        mimetype: audioFile.type,
      }
    );

    if (error) {
      console.error("Deepgram transcription error:", error);
      return NextResponse.json(
        { error: "Transcription failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      text: result.results?.channels[0]?.alternatives[0]?.transcript || "",
    });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}
