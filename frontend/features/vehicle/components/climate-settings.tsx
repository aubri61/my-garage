"use client";

import { useState } from "react";
import type { Vehicle } from "@/features/vehicle/types";

type Props = { vehicle: Vehicle; mode: "cooling" | "heating" };

export function ClimateSettings({ vehicle, mode }: Props) {
  const [temperature, setTemperature] = useState(mode === "cooling" ? 22 : 26);
  const [duration, setDuration] = useState(10);
  const connected = vehicle.connectionStatus === "connected";

  return (
    <div className="climate-settings">
      <p className="dialog-description">탑승 전에 원하는 실내 온도와 작동 시간을 설정하세요.</p>
      <fieldset disabled={!connected}>
        <legend className="sr-only">{mode === "cooling" ? "공조" : "난방"} 설정</legend>
        <label className="temperature-label" htmlFor="climate-temperature">희망 온도<output htmlFor="climate-temperature">{temperature.toFixed(1)}<span>°C</span></output></label>
        <input id="climate-temperature" type="range" min="18" max="30" step="0.5" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} />
        <div className="range-labels"><span>18°C</span><span>30°C</span></div>
        <label className="duration-label" htmlFor="climate-duration">작동 시간</label>
        <select id="climate-duration" value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
          <option value={5}>5분</option><option value={10}>10분</option><option value={15}>15분</option>
        </select>
      </fieldset>
      <p className="settings-summary">{mode === "cooling" ? "공조" : "난방"} · {temperature.toFixed(1)}°C · {duration}분</p>
      <button className="service-action dialog-action" type="button" disabled aria-describedby="climate-execution-note">{mode === "cooling" ? "공조" : "난방"} 실행</button>
      <p id="climate-execution-note" className="action-note">{connected ? "설정 화면 데모입니다. 원격 실행 요청 흐름은 다음 단계에서 연결합니다." : "차량 연결이 끊겨 원격 제어를 사용할 수 없습니다."}</p>
    </div>
  );
}
