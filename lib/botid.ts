import { checkBotId } from "botid/server";
import { NextResponse } from "next/server";

export const rejectBotRequest = async () => {
  const { isBot } = await checkBotId();

  return isBot
    ? NextResponse.json(
        { error: "Automated requests are not allowed." },
        { status: 403 },
      )
    : null;
};
