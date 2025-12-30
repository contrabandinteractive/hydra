import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { description } = await request.json();

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: `You are a fair negotiation agent that analyzes collaborative deals and suggests equitable splits, recoup targets, and pricing.

Your task is to:
1. Identify all collaborators mentioned in the description
2. Suggest fair percentage splits (in basis points where 10000 = 100%) based on their contributions
3. Determine who should recoup first (usually the person who fronted costs or took the most risk)
4. Calculate a fair recoup target in MNEE tokens (consider typical costs in their industry)
5. Suggest a fair product price in MNEE tokens

Consider factors like:
- Who contributed the most work, time, or expertise?
- Who took financial risk or fronted money?
- Industry standards for similar products/services
- The value provided to customers

IMPORTANT:
- Splits must add up to exactly 10000 basis points (100%)
- Recoup target should be realistic and based on actual costs mentioned
- Price should be fair market value for the product/service
- If costs aren't mentioned, estimate based on industry standards`,
        },
        {
          role: "user",
          content: description,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "deal_negotiation",
          strict: true,
          schema: {
            type: "object",
            properties: {
              dealName: {
                type: "string",
                description: "A short name for this deal (e.g., 'Studio Album', 'App Development')",
              },
              productName: {
                type: "string",
                description: "What is being sold (e.g., 'Digital Download', 'Consulting Package')",
              },
              collaborators: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: {
                      type: "string",
                      description: "Name or role of the collaborator",
                    },
                    address: {
                      type: "string",
                      description: "Placeholder wallet address (0x...)",
                    },
                    splitPercentage: {
                      type: "number",
                      description: "Percentage split in basis points (10000 = 100%)",
                    },
                    reasoning: {
                      type: "string",
                      description: "Brief explanation of why this split is fair",
                    },
                  },
                  required: ["name", "address", "splitPercentage", "reasoning"],
                  additionalProperties: false,
                },
                description: "List of all collaborators with their splits",
              },
              recoupRecipient: {
                type: "string",
                description: "Name of the person who should recoup first",
              },
              recoupTarget: {
                type: "number",
                description: "Amount in MNEE tokens to recoup",
              },
              recoupReasoning: {
                type: "string",
                description: "Why this person should recoup and why this amount",
              },
              productPrice: {
                type: "number",
                description: "Price per unit in MNEE tokens",
              },
              pricingReasoning: {
                type: "string",
                description: "Explanation of how this price was determined",
              },
              summary: {
                type: "string",
                description: "Overall summary of the deal structure and fairness",
              },
            },
            required: [
              "dealName",
              "productName",
              "collaborators",
              "recoupRecipient",
              "recoupTarget",
              "recoupReasoning",
              "productPrice",
              "pricingReasoning",
              "summary",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const result = completion.choices[0]?.message?.content;

    if (!result) {
      throw new Error("No response from OpenAI");
    }

    const negotiation = JSON.parse(result);

    return NextResponse.json(negotiation);
  } catch (error) {
    console.error("Negotiation error:", error);
    return NextResponse.json(
      { error: "Failed to negotiate deal terms" },
      { status: 500 }
    );
  }
}
