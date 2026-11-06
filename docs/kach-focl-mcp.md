# KACH + FOCL through ChatGPT

The KACH MCP is a private bridge between two connected tools in the same ChatGPT conversation:

1. The FOCL Wedding Planner reads the selected wedding from FOCL.
2. `list_kach_weddings` identifies the matching KACH project.
3. `preview_focl_import` compares the FOCL data with the KACH source of truth.
4. ChatGPT presents the proposed changes to the photographer.
5. Only after explicit approval, `apply_focl_import` updates KACH.

The dashboard database remains the source of truth for the client journey, timeline dates, milestones, tasks, referral moments and messages. FOCL supplies planning facts for the client card. Missing or empty FOCL sections do not erase manual KACH data.

## Safety guarantees

- The MCP endpoint accepts only Clerk OAuth access tokens issued for the exact KACH MCP audience.
- ChatGPT opens the normal Clerk sign-in and consent flow; no shared connector secret is stored.
- Every query is scoped to the authenticated Clerk owner id.
- A preview expires after 30 minutes and can only be applied once.
- Project and client-card version checks reject a preview when KACH changed in the meantime.
- Every applied import first creates a restorable wedding version.
- The activity log attributes the write to `FOCL via ChatGPT`.
- Journey tasks, referrals, gifts, messages and manual milestone overrides are not part of the import write path.
- The short-lived source payload is cleared from the preview row after apply or expiry.

## Production activation

1. Apply database migration `0009_ambiguous_ben_parker.sql`.
2. Keep the existing Clerk server and publishable keys available to the Vercel functions. `KACH_MCP_RESOURCE_URL` only needs to be set when the production URL differs from `https://tools.kachweddings.no/mcp`.
3. In Clerk, add that full MCP URL under **Agents → MCP servers** and allow public OAuth clients. Enable CIMD and default `profile` scope; enable DCR only if the target ChatGPT client requires it.
4. Deploy the commit and verify that unauthenticated `POST /mcp` returns `401` with a `resource_metadata` challenge.
5. Add `https://tools.kachweddings.no/mcp` as a private custom MCP connection in ChatGPT, then sign in to KACH through Clerk.
6. In one chat, connect both FOCL Wedding Planner and KACH Weddings. Ask ChatGPT to list FOCL weddings and KACH weddings, choose the correct pair, preview, and wait for approval before apply.

The OAuth identity maps directly to the same Clerk owner id already used by the dashboard. A future second-shooter role can therefore reuse the transport while adding narrower server-side permissions.
