import { NextResponse } from 'next/server';

const STANDARD_PANEL_WP = [10, 20, 30, 50, 80, 100, 150, 200];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const P = Math.max(0.1, Number(body.P ?? 1));
    const t = Math.max(1, Math.min(24, Number(body.t ?? 24)));
    const H = Math.max(0.5, Number(body.H ?? 2));
    const DoD = Math.max(0.2, Math.min(1, Number(body.DoD ?? 0.8)));
    const eta = Math.max(0.3, Math.min(1, Number(body.eta ?? 0.85)));
    const PSH = Math.max(1, Math.min(8, Number(body.PSH ?? 4)));
    const fRugi = Math.max(0.3, Math.min(1, Number(body.fRugi ?? 0.7)));

    const eHarian = P * t;
    const cBateraiWh = (eHarian * H) / (DoD * eta);
    const pPanelWp = eHarian / (PSH * fRugi);
    const pPanelRounded =
      STANDARD_PANEL_WP.find((w) => w >= pPanelWp) ?? Math.ceil(pPanelWp / 50) * 50;

    return NextResponse.json({
      eHarianWh: Number(eHarian.toFixed(2)),
      cBateraiWh: Number(cBateraiWh.toFixed(2)),
      cBateraiRoundedWh: Math.round(cBateraiWh),
      pPanelWp: Number(pPanelWp.toFixed(2)),
      pPanelRecommendedWp: pPanelRounded,
      simulasi: true,
    });
  } catch {
    return NextResponse.json({ error: 'Parameter kalkulator surya tidak valid.' }, { status: 400 });
  }
}
