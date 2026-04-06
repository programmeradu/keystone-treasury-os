import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";

export async function POST(request: Request) {
    try {
        const { subOrgName, attestation, challenge } = await request.json();
        console.log("Turnkey Register Payload:", {
            subOrgName,
            challengeLength: challenge?.length,
            attestationCredentialId: attestation?.credentialId?.substring(0, 20) + "...",
            attestationHasClientDataJson: !!attestation?.clientDataJson,
            attestationHasAttestationObject: !!attestation?.attestationObject,
            attestationTransports: attestation?.transports
        });

        const apiPublicKey = process.env.TURNKEY_API_PUBLIC_KEY;
        const apiPrivateKey = process.env.TURNKEY_API_PRIVATE_KEY;
        const organizationId = process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID || process.env.NEXT_PUBLIC_TURNKEY_ORG_ID || process.env.TURNKEY_ORG_ID;

        if (!apiPublicKey || !apiPrivateKey || !organizationId) {
            // Fail loudly if Turnkey is not configured - do NOT return fake success
            console.error("[Turnkey] Missing required credentials:", {
                hasApiPublicKey: !!apiPublicKey,
                hasApiPrivateKey: !!apiPrivateKey,
                hasOrganizationId: !!organizationId,
            });
            return NextResponse.json(
                {
                    error: "Turnkey wallet service not configured. Please contact support.",
                    code: "WALLET_SERVICE_UNAVAILABLE",
                },
                { status: 503 }
            );
        }

        // Build the exact request body per the API docs
        const requestBody = {
            type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7",
            timestampMs: Date.now().toString(),
            organizationId: organizationId,
            parameters: {
                subOrganizationName: subOrgName,
                rootQuorumThreshold: 1,
                rootUsers: [
                    {
                        userName: "Keystone Architect",
                        userEmail: "architect@keystone.os",
                        apiKeys: [],
                        oauthProviders: [],
                        authenticators: [
                            {
                                authenticatorName: "Keystone Passkey",
                                challenge: challenge,
                                attestation: {
                                    credentialId: attestation.credentialId,
                                    clientDataJson: attestation.clientDataJson,
                                    attestationObject: attestation.attestationObject,
                                    transports: attestation.transports,
                                },
                            },
                        ],
                    },
                ],
            },
        };

        console.log("Request body:", JSON.stringify(requestBody, null, 2));

        // Create stamper and sign the request
        const stamper = new ApiKeyStamper({
            apiPublicKey,
            apiPrivateKey,
        });

        const bodyString = JSON.stringify(requestBody);
        const stamp = await stamper.stamp(bodyString);

        // Make direct API call
        const response = await fetch("https://api.turnkey.com/public/v1/submit/create_sub_organization", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                [stamp.stampHeaderName]: stamp.stampHeaderValue,
            },
            body: bodyString,
        });

        const result = await response.json();
        console.log("Turnkey API Response:", JSON.stringify(result, null, 2));

        if (!response.ok) {
            console.error("Turnkey API Error:", result);
            return NextResponse.json(
                { error: result.message || "Turnkey API error" },
                { status: response.status }
            );
        }

        // Extract sub-organization ID from response
        const subOrgId =
            result?.activity?.result?.createSubOrganizationResultV7?.subOrganizationId ||
            "";

        return NextResponse.json({
            subOrganizationId: subOrgId,
            activityId: result?.activity?.id,
            status: result?.activity?.status,
        });

    } catch (error: any) {
        console.error("Turnkey Registration Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create sub-organization" },
            { status: 500 }
        );
    }
}
