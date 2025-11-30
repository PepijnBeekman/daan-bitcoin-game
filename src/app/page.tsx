"use client";

import React, { useEffect, useState } from "react";
import { LineChart, Line } from "recharts";

type Phase = "idle" | "bought" | "finished";
type Scenario = 1 | 2 | 3 | null;

const LOAN = 1000;
const BUY_FEE = 20;
// Fictieve gemiddelde BTC-prijs
const START_PRICE = 91000;

function formatMoney(value: number): string {
  return value.toFixed(2);
}

export default function HomePage() {
  const [price, setPrice] = useState<number>(START_PRICE);
  const [history, setHistory] = useState<{ time: number; price: number }[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [btcAmount, setBtcAmount] = useState<number>(0);
  const [finalValue, setFinalValue] = useState<number | null>(null);
  const [scenario, setScenario] = useState<Scenario>(null);
  const [message, setMessage] = useState<string>("");
  const [lastBuyPrice, setLastBuyPrice] = useState<number | null>(null);

  // Fictieve koers: mean-reverting rond START_PRICE, 2x per seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setPrice((prev) => {
        // hoeveel de koers per tick teruggetrokken wordt richting START_PRICE
        const MEAN_REVERSION = 0.05; // 5% van het verschil per tick

        // ruis: ongeveer ±2.5% per tick
        const NOISE_PER_TICK = 0.025;
        const noiseFactor =
          (Math.random() - 0.5) * 2 * NOISE_PER_TICK; // -0.025 .. +0.025

        // trek een stukje richting START_PRICE
        const reversion = MEAN_REVERSION * (START_PRICE - prev);

        // pas ruis toe
        const noisy = prev * (1 + noiseFactor);

        const next = noisy + reversion;

        // ondergrens zodat het niet instort
        const clamped = Math.max(1000, next);

        // history updaten met de nieuwe waarde
        setHistory((h) => {
          const newPoint = { time: Date.now(), price: clamped };
          const trimmed = [...h, newPoint].slice(-120); // laatste 60s bij 2 Hz
          return trimmed;
        });

        return clamped;
      });
    }, 500); // 2 Hz

    return () => clearInterval(interval);
  }, []);

  const handleBuy = () => {
    if (phase !== "idle") return;

    const amountUsd = LOAN - BUY_FEE; // 980
    const btc = amountUsd / price;

    setBtcAmount(btc);
    setLastBuyPrice(price);
    setPhase("bought");

    setMessage(
      `Bought $${formatMoney(amountUsd)} of BTC at $${formatMoney(
        price
      )} with a $${formatMoney(
        BUY_FEE
      )} transaction fee. You now have ${btc.toFixed(6)} BTC in your wallet.`
    );
  };

  const handleSell = () => {
    if (phase !== "bought" || btcAmount <= 0) return;

    const F = btcAmount * price; // eindwaarde zonder extra fees
    const profit = F - LOAN;

    let sc: Scenario = null;
    let msg = "";

    if (F < 1000) {
      // Scenario 1: verlies
      sc = 1;
      const Y = LOAN - F;
      msg = `You lost some of my money. Please pay me $${formatMoney(
        Y
      )} or try again.`;
    } else if (F <= 1025) {
      // Scenario 2: kleine winst
      sc = 2;
      const Z = F - LOAN;
      msg = `You won $${formatMoney(
        Z
      )}. Pay out now or try again?`;
    } else {
      // Scenario 3: grote winst
      sc = 3;
      const feeDisplay = Math.max(0, profit - 25); // "transaction fee" = winst - 25
      msg = `Big winner! Final value: $${formatMoney(
        F
      )}. Transaction fee: $${formatMoney(
        feeDisplay
      )}.`;
    }

    setFinalValue(F);
    setScenario(sc);
    setPhase("finished");
    setMessage(msg);
  };

  const handleTryAgain = () => {
    // reset spel-state, maar koers loopt gewoon door
    setPhase("idle");
    setBtcAmount(0);
    setFinalValue(null);
    setScenario(null);
    setLastBuyPrice(null);
    setMessage("");
  };

  const handlePayout = () => {
  if (!finalValue) return;

  const profit = finalValue - LOAN;
  const transactionFee = profit > 25 ? profit - 25 : 0;
  const netAmount = profit - transactionFee;

  const subject = encodeURIComponent("Daan Bitcoin Game – payout summary");
  const body = encodeURIComponent(
    `Hey Pepijn,

Here’s the trade result:

Final value: $${formatMoney(finalValue)}
Profit: $${formatMoney(profit)}
Transaction fee: $${formatMoney(transactionFee)}
Net amount owed: $${formatMoney(netAmount > 0 ? netAmount : 0)}

Time to pay up! 💰

– Daan`
  );

  const mailto = `mailto:pepijn@occamdx.com?subject=${subject}&body=${body}`;
  window.location.href = mailto;
};


  // UI helpers voor knoppen
  const renderButtons = () => {
    if (phase === "idle") {
      return (
        <button
          onClick={handleBuy}
          className="px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700"
        >
          Buy now
        </button>
      );
    }

    if (phase === "bought") {
      return (
        <button
          onClick={handleSell}
          className="px-4 py-2 rounded bg-orange-600 text-white font-semibold hover:bg-orange-700"
        >
          Sell now
        </button>
      );
    }

    if (phase === "finished") {
      if (scenario === 1) {
        // verlies
        return (
          <div className="flex flex-col items-center gap-3">
            {/* Placeholder "Tikkie logo" */}
            <div className="w-24 h-10 bg-green-500 text-white font-bold flex items-center justify-center rounded">
              Tikkie
            </div>
            <button
              onClick={handleTryAgain}
              className="px-4 py-2 rounded bg-gray-700 text-white font-semibold hover:bg-gray-800"
            >
              Try again
            </button>
          </div>
        );
      }

      if (scenario === 2) {
        // kleine winst
        return (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handlePayout}
              className="px-4 py-2 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Pay out now
            </button>
            <button
              onClick={handleTryAgain}
              className="px-4 py-2 rounded bg-gray-700 text-white font-semibold hover:bg-gray-800"
            >
              Try again
            </button>
          </div>
        );
      }

      if (scenario === 3) {
        // grote winst
        return (
          <button
            onClick={handlePayout}
            className="px-4 py-2 rounded bg-purple-600 text-white font-semibold hover:bg-purple-700"
          >
            Send payment request
          </button>
        );
      }
    }

    return null;
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center text-slate-100 bg-cover bg-center"
      style={{ backgroundImage: "url('/bkg.png')" }}
    >

      <div className="max-w-xl w-full mx-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/70 shadow-lg">
        <h1 className="text-2xl font-bold mb-2 text-center">
          Daan&apos;s Birthday Bitcoin Minigame
        </h1>
        <p className="text-sm text-center text-slate-300 mb-6">
          Happy birthday Daan!!!! Hey, we love you but we refuse to just give you money for your birthday. That's just not our love language. But ok, since it's your birthday we guess we can lend you some investment budget to *earn* your gift. So buy low, sell high! Hint: mind the transaction fees!
        </p>

        <div className="mb-4 flex flex-col items-center">
          <div className="text-sm uppercase text-slate-400 tracking-wide">
            Fictitious BTC price
          </div>
          <div className="text-3xl font-mono font-semibold">
            ${formatMoney(price)}
          </div>
          {lastBuyPrice !== null && (
            <div className="text-xs text-slate-400 mt-1">
              Bought at: ${formatMoney(lastBuyPrice)}
            </div>
          )}
          <div className="w-full h-32 mt-2">
            {history.length > 2 && (
              <LineChart
                width={400}
                height={120}
                data={history.map((p) => ({
                  time: p.time,
                  price: p.price,
                }))}
              >
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#22d3ee"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </div>
        </div>

        <div className="mb-4 text-center text-sm text-slate-200">
          <div>Loan amount: ${LOAN}</div>
          <div>Buy fee: ${BUY_FEE}</div>
          <div>
            BTC in wallet:{" "}
            <span className="font-mono">
              {btcAmount > 0 ? btcAmount.toFixed(6) : "0.000000"}
            </span>
          </div>
          {finalValue !== null && (
            <div className="mt-1">
              Final value: ${formatMoney(finalValue)} (
              {finalValue >= LOAN ? "profit" : "loss"})
            </div>
          )}
        </div>

        <div className="mb-4 min-h-[3rem] text-center text-sm text-slate-100">
          {message || (
            <span className="text-slate-400">
              Watch the price wobble and press{" "}
              <span className="font-semibold">Buy now</span> when you dare.
            </span>
          )}
        </div>

        <div className="flex justify-center mt-4">{renderButtons()}</div>

        <p className="mt-6 text-[11px] text-slate-500 text-center">
          This is a fictional game. No real Bitcoin is harmed. Real money may
          be harmed if you play well enough - feel fry to try again if not.
        </p>
      </div>
    </main>
  );
}
