import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";
import { createClient } from "@/lib/supabase/server";

// AWS S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});

// AWS Transcribe client
const transcribeClient = new TranscribeClient({
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

    // Upload to S3
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME || "luizai",
        Key: s3Key,
        Body: buffer,
        ContentType: audioFile.type,
      })
    );

    // Start transcription job
    const transcriptionJobName = `transcription-${userId}-${timestamp}`;
    const s3Uri = `s3://${process.env.AWS_S3_BUCKET_NAME || "luizai"}/${s3Key}`;

    await transcribeClient.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: transcriptionJobName,
        Media: { MediaFileUri: s3Uri },
        LanguageCode: "pt-BR", // Portuguese (Brazil)
        MediaFormat: "webm",
      })
    );

    // Poll for transcription job completion
    let transcriptionResult = null;
    let attempts = 0;
    const maxAttempts = 30; // Maximum number of polling attempts

    while (attempts < maxAttempts) {
      const { TranscriptionJob } = await transcribeClient.send(
        new GetTranscriptionJobCommand({
          TranscriptionJobName: transcriptionJobName,
        })
      );

      if (TranscriptionJob?.TranscriptionJobStatus === "COMPLETED") {
        // Fetch the transcription result
        if (TranscriptionJob.Transcript?.TranscriptFileUri) {
          const response = await fetch(
            TranscriptionJob.Transcript.TranscriptFileUri
          );
          const data = await response.json();
          transcriptionResult = data.results.transcripts[0].transcript;
          break;
        }
      } else if (TranscriptionJob?.TranscriptionJobStatus === "FAILED") {
        return NextResponse.json(
          { error: "Transcription job failed" },
          { status: 500 }
        );
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!transcriptionResult) {
      return NextResponse.json(
        { error: "Transcription timed out" },
        { status: 504 }
      );
    }

    return NextResponse.json({ text: transcriptionResult });
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return NextResponse.json(
      { error: "Failed to process audio" },
      { status: 500 }
    );
  }
}
