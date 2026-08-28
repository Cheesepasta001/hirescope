import { redirect } from "next/navigation";

/** /hire on its own has nothing to show; search is the more useful default. */
export default function HireIndex() {
  redirect("/hire/search");
}
