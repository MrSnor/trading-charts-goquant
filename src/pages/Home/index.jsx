import CandleSticks from "@/components/CandleSticks";
import Loader from "@/components/Loader";
import VolumeBarChart from "@/components/VolumeBarChart";
import CombinedChart from "@/components/CombinedChart";
import { useCallback, useEffect, useState } from "react";

function Home() {
  const [interval, setInterval] = useState("1d");
  const [candleData, setCandleData] = useState([]);
  const [volumeData, setVolumeData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const symbol = "BTCUSDT";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BINANCE_API}?symbol=${symbol}&interval=${interval}&limit=100`
      );
      const data = await response.json();

      const formattedCandleData = data.map((d) => ({
        time: d[0] / 1000,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
      }));

      const formattedVolumeData = data.map((d) => {
        return [parseInt(d[0]), parseFloat(d[5])];
      });

      setCandleData(formattedCandleData);
      setVolumeData(formattedVolumeData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  }, [interval]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-4 text-center">Trading Charts</h1>
      <div className="mb-4 flex justify-center space-x-4">
        <select
          value={interval}
          onChange={(e) => setInterval(e.target.value)}
          className="bg-slate-700 text-white p-2 rounded"
        >
          <option value="1m">1 minute</option>
          <option value="5m">5 minutes</option>
          <option value="15m">15 minutes</option>
          <option value="1h">1 hour</option>
          <option value="4h">4 hours</option>
          <option value="1d">1 day</option>
        </select>
        <button
          onClick={fetchData}
          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded"
        >
          Refresh
        </button>
      </div>
      {loading ? (
        <Loader />
      ) : (
        <div className="space-y-10">
          <h2 className="text-2xl font-bold mt-8 mb-4">Combined Chart</h2>
          <CombinedChart
            candleData={candleData}
            volumeData={volumeData}
          />
          <h2 className="text-2xl font-bold mt-8 mb-4">Candle Stick Chart</h2>
          <CandleSticks data={candleData} />

          <h2 className="text-2xl font-bold mt-8 mb-4">Volume Bar Chart</h2>
          <VolumeBarChart data={volumeData} priceData={candleData} />
        </div>
      )}
    </div>
  );
}

export default Home;
