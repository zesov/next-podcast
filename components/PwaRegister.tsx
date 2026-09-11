"use client";

// PWA Service Worker 注册器
// 仅生产环境注册：dev 下 SW 会缓存旧 chunk干扰 Turbopack HMR
import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // 静默失败：不支持或受限环境
      });
    };

    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}