import OpenAI from "openai";
import { NextResponse } from "next/server";

import { isAuthorizedInternalRequest } from "@/app/lib/internal-api-auth";
import { supabaseServer } from "@/app/lib/supabase-server";
import { OutreachService } from "@/lib/services/outreach-service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const outreachService =
  new OutreachService();

export async function POST(
  req: Request,
) {
  try {
    if (
      !isAuthorizedInternalRequest(req)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body =
      await req.json();

    const businessId =
      String(
        body.businessId ||
          process.env.DEFAULT_BUSINESS_ID ||
          "",
      ).trim();

    const contactId =
      String(
        body.contactId || "",
      ).trim();

    const objective =
      String(
        body.objective || "SELL",
      ).trim();

    const instructions =
      String(
        body.instructions || "",
      ).trim();

    if (!businessId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "businessId is required",
        },
        {
          status: 400,
        },
      );
    }

    if (!contactId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "contactId is required",
        },
        {
          status: 400,
        },
      );
    }

    const {
      data: contact,
      error: contactError,
    } =
      await supabaseServer
        .from("outreach_contacts")
        .select("*")
        .eq(
          "business_id",
          businessId,
        )
        .eq(
          "id",
          contactId,
        )
        .maybeSingle();

    if (contactError) {
      throw contactError;
    }

    if (!contact) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Outreach contact not found",
        },
        {
          status: 404,
        },
      );
    }

    const completion =
      await openai.chat.completions.create(
        {
          model:
            "gpt-4.1-mini",
          messages: [
            {
              role: "system",
              content:
                "You are ZennX AI. Write concise, personalized B2B outreach that sounds human, direct, credible, and specific. Position ZennX as an AI front-desk and operations layer for service businesses: it can respond to leads quickly, qualify them, follow up, help book appointments, keep the owner informed, and reduce manual front-desk workload. Do not fabricate facts. Do not claim the prospect has a specific problem unless that problem is explicitly present in the supplied contact context. Avoid hype, spam language, fake familiarity, and excessive punctuation. Return only the message body with no labels, markdown, quotes, or explanation.",
            },
            {
              role: "user",
              content: `
Create one outreach message.

Objective:
${objective}

Contact:
${JSON.stringify(contact)}

Additional instructions:
${
  instructions ||
  "Introduce ZennX naturally and create enough curiosity for the recipient to reply."
}

Requirements:
- Match the contact and organization context.
- Keep it concise and natural.
- Focus on one or two concrete ZennX benefits, not a long feature list.
- Do not invent achievements, pain points, revenue loss, or personal facts.
- Do not sound like a mass email.
- End with a low-friction call to action.
              `.trim(),
            },
          ],
        },
      );

    const generatedBody =
      (
        completion
          .choices[0]
          ?.message
          ?.content || ""
      ).trim();

    if (!generatedBody) {
      return NextResponse.json(
        {
          success: false,
          error:
            "AI returned an empty outreach message",
        },
        {
          status: 502,
        },
      );
    }

    const message =
      await outreachService
        .createDraft({
          business_id:
            businessId,
          contact_id:
            contact.id,
          channel:
            contact.platform,
          body:
            generatedBody,
          personalization_context:
            {
              objective,
              instructions:
                instructions ||
                undefined,
              generated_by:
                "zennx-ai",
            },
          requires_approval:
            true,
        });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error(
      "OUTREACH GENERATE ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Outreach generation failed",
      },
      {
        status: 500,
      },
    );
  }
}
