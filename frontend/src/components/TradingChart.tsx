import { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, ColorType } from 'lightweight-charts';

export const TradingChart = ({
    initialData,
    lastCandle,
    markers = [],
    onSeek
}: {
    initialData: CandlestickData[],
    lastCandle: CandlestickData | null,
    markers?: any[],
    onSeek?: (timeIndex: number, time?: number) => void
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        let chart: IChartApi;
        try {
            chart = createChart(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth || 800,
                height: 600,
                layout: {
                    background: { type: ColorType.Solid, color: '#1E1E1E' },
                    textColor: '#DDD',
                },
                grid: {
                    vertLines: { color: '#2B2B43' },
                    horzLines: { color: '#2B2B43' },
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                },
                localization: {
                    timeFormatter: (time: number) => {
                        // Formats the UNIX timestamp into IST
                        const date = new Date(time * (time > 1e11 ? 1 : 1000));
                        return date.toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit', hour12: false
                        });
                    }
                }
            });
            chartRef.current = chart;

            const candlestickSeries = chart.addCandlestickSeries({
                upColor: '#26a69a', downColor: '#ef5350', borderVisible: false,
                wickUpColor: '#26a69a', wickDownColor: '#ef5350'
            });
            seriesRef.current = candlestickSeries;

            if (initialData && initialData.length > 0) {
                // lightweight-charts requires time in UNIX timestamp (seconds)
                const formattedData = initialData.map((d: any) => ({
                    ...d,
                    time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time
                }));
                candlestickSeries.setData(formattedData);
            }

            // Click-to-seek functionality
            chart.subscribeClick((param) => {
                if (!param || !param.time || !onSeek) return;

                // Find the index of the clicked time in initialData
                const clickedTime = param.time as number;
                const idx = initialData.findIndex(d => {
                    const dTime = typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time;
                    return dTime === clickedTime;
                });

                onSeek(idx !== -1 ? idx : 0, clickedTime);
            });

        } catch (err) {
            console.error("Error creating chart", err);
        }

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) {
                chartRef.current.remove();
            }
        };
    }, [initialData, onSeek]);

    useEffect(() => {
        if (seriesRef.current && lastCandle) {
            const formattedCandle: any = {
                ...lastCandle,
                time: (typeof lastCandle.time === 'string' ? new Date(lastCandle.time).getTime() / 1000 : lastCandle.time) as any
            };
            try {
                seriesRef.current.update(formattedCandle);
            } catch (err) {
                console.warn("Could not update candlestick:", err);
            }
        }
    }, [lastCandle]);

    useEffect(() => {
        if (seriesRef.current && markers) {
            try {
                // Ensure markers are uniquely positioned or lightweight charts might error
                const uniqueMarkers = Array.from(new Map(markers.map(m => [m.time, m])).values());
                seriesRef.current.setMarkers(uniqueMarkers as any);
            } catch (e) {
                console.error("Error setting markers", e);
            }
        }
    }, [markers]);

    return (
        <div ref={chartContainerRef} style={{ width: '100%', height: '600px', position: 'relative' }} />
    );
};
