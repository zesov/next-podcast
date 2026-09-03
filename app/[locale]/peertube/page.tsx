import { setRequestLocale } from "next-intl/server";
import { headers } from "next/headers";
import { routing } from "@/i18n/routing";
import PeerTubePage from "@/components/PeerTube/PeerTubePage";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { PeerTubeSearchResponse } from "@/app/types";

interface Props {
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

async function buildBaseUrl(): Promise<string> {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  const host = (await headers()).get("host");
  return host ? `http://${host}` : "http://localhost:3000";
}

export default async function PeerTubeHome({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  let initial: PeerTubeSearchResponse = { total: 0, data: [] };
  try {
    const res = await fetch(`${await buildBaseUrl()}/api/peertube?search=&start=0&count=12`, {
      cache: "no-store",
    });
    if (res.ok) {
      initial = (await res.json()) as PeerTubeSearchResponse;
    }
  } catch {
    // initial load 失败时静默返回空数据，客户端会展示空状态
  }

  return (
    <>
      <Navbar />
      <PeerTubePage initialVideos={initial.data} />
      <Footer />
    </>
  );
}
