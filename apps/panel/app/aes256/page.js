import { redirect } from "next/navigation";

export default function Aes256Page() {
  redirect("http://127.0.0.1:3000/decrypter");
}
