import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import AskQuestionPage from "./AskQuestionClient";

export default async function Page() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/landing");
  }

  return <AskQuestionPage />;
}
