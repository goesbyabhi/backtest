import { useEffect, useRef, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, ColorType, LineStyle, Time } from 'lightweight-charts';
import { IndicatorConfig } from './IndicatorModal';
import { X } from 'lucide-react';
import { VolumeProfilePlugin, VolumeProfileSession } from './plugins/VolumeProfilePlugin';

export const TradingChart = ({
    initialData,
    lastCandle,
    markers = [],
    onSeek,
    activeIndicators = [],
    onRemoveIndicator
}: {
    initialData: any[],
    lastCandle: any | null,
    markers?: any[],
    onSeek?: (timeIndex: number, time?: number) => void,
    activeIndicators?: IndicatorConfig[],
    onRemoveIndicator?: (id: string) => void
}) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const rsiChartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const rsiChartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

    // Main chart pointers
    const indicatorSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
    const bbSeriesRef = useRef<Map<string, { upper: ISeriesApi<"Line">, middle: ISeriesApi<"Line">, lower: ISeriesApi<"Line"> }>>(new Map());

    // Sub chart pointers
    const oscSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map()); // RSI, ATR
    const macdSeriesRef = useRef<Map<string, { macd: ISeriesApi<"Line">, signal: ISeriesApi<"Line">, hist: ISeriesApi<"Histogram"> }>>(new Map());

    const [crosshairValues, setCrosshairValues] = useState<Record<string, Record<string, number | null>>>({});

    useEffect(() => {
        if (!chartContainerRef.current) return;

        let chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth || 800,
            height: 500,
            layout: {
                background: { type: ColorType.Solid, color: '#050505' },
                textColor: '#999',
                attributionLogo: false
            },
            grid: {
                vertLines: { color: '#222222', style: LineStyle.Solid },
                horzLines: { color: '#222222', style: LineStyle.Solid },
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            localization: {
                timeFormatter: (time: number) => {
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
            upColor: '#00E676', downColor: '#FF1744', borderVisible: false,
            wickUpColor: '#00E676', wickDownColor: '#FF1744'
        });
        seriesRef.current = candlestickSeries;

        const volumeSeries = chart.addHistogramSeries({
            color: '#00E676',
            priceFormat: { type: 'volume' },
            priceScaleId: '',
        });
        volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        volumeSeriesRef.current = volumeSeries;

        if (initialData && initialData.length > 0) {
            const formattedData = initialData.map((d: any) => ({
                ...d,
                time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time
            }));
            candlestickSeries.setData(formattedData);

            const volumeData = initialData.map((d: any) => ({
                time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time,
                value: d.volume || 0,
                color: d.close >= d.open ? '#00E676' : '#FF1744'
            }));
            volumeSeries.setData(volumeData as any);
        }

        chart.subscribeClick((param) => {
            if (!param || !param.time || !onSeek) return;
            const clickedTime = param.time as number;
            const idx = initialData.findIndex(d => {
                const dTime = typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time;
                return dTime === clickedTime;
            });
            onSeek(idx !== -1 ? idx : 0, clickedTime);
        });

        chart.subscribeCrosshairMove(param => {
            if (param.time && param.seriesData) {
                const vals: Record<string, Record<string, number | null>> = {};

                // Track standard single lines (EMA, VWAP, Daily Levels)
                indicatorSeriesRef.current.forEach((series, id) => {
                    const data = param.seriesData.get(series) as any;
                    vals[id] = { val: data ? data.value : null };
                });

                // Track BB
                bbSeriesRef.current.forEach((seriesGroup, id) => {
                    const upper = param.seriesData.get(seriesGroup.upper) as any;
                    const middle = param.seriesData.get(seriesGroup.middle) as any;
                    const lower = param.seriesData.get(seriesGroup.lower) as any;
                    vals[id] = {
                        upper: upper ? upper.value : null,
                        middle: middle ? middle.value : null,
                        lower: lower ? lower.value : null
                    };
                });

                // Track Oscillators (RSI, ATR)
                oscSeriesRef.current.forEach((series, id) => {
                    const data = param.seriesData.get(series) as any;
                    vals[id] = { val: data ? data.value : null };
                });

                // Track MACD
                macdSeriesRef.current.forEach((seriesGroup, id) => {
                    const macd = param.seriesData.get(seriesGroup.macd) as any;
                    const signal = param.seriesData.get(seriesGroup.signal) as any;
                    const hist = param.seriesData.get(seriesGroup.hist) as any;
                    vals[id] = {
                        macd: macd ? macd.value : null,
                        signal: signal ? signal.value : null,
                        hist: hist ? hist.value : null
                    };
                });

                setCrosshairValues(vals);
            } else {
                setCrosshairValues({});
            }
        });

        // Sub chart setup
        let rsiChart: IChartApi;
        if (rsiChartContainerRef.current) {
            rsiChart = createChart(rsiChartContainerRef.current, {
                width: rsiChartContainerRef.current.clientWidth || 800,
                height: 0,
                layout: { background: { type: ColorType.Solid, color: '#050505' }, textColor: '#999' },
                grid: { vertLines: { color: '#222222' }, horzLines: { color: '#222222' } },
                timeScale: { visible: false }
            });
            rsiChartRef.current = rsiChart;

            chart.timeScale().subscribeVisibleLogicalRangeChange(timeRange => {
                if (timeRange && rsiChart) {
                    rsiChart.timeScale().setVisibleLogicalRange(timeRange);
                }
            });

            chart.subscribeCrosshairMove(param => {
                if (param.time && rsiChart) {
                    let lastActiveSeries;
                    for (const s of oscSeriesRef.current.values()) lastActiveSeries = s;
                    for (const s of macdSeriesRef.current.values()) lastActiveSeries = s.macd;

                    if (lastActiveSeries && param.point) {
                        rsiChart.setCrosshairPosition(param.point.x, param.time, lastActiveSeries);
                    }
                } else if (!param.time && rsiChart) {
                    rsiChart.clearCrosshairPosition();
                }
            });

            rsiChart.subscribeCrosshairMove(param => {
                if (param.time && param.seriesData) {
                    const vals = { ...crosshairValues };
                    oscSeriesRef.current.forEach((series, id) => {
                        const data = param.seriesData.get(series) as any;
                        if (data) vals[id] = { val: data.value };
                    });
                    macdSeriesRef.current.forEach((seriesGroup, id) => {
                        const macd = param.seriesData.get(seriesGroup.macd) as any;
                        const signal = param.seriesData.get(seriesGroup.signal) as any;
                        const hist = param.seriesData.get(seriesGroup.hist) as any;
                        if (macd || signal || hist) {
                            vals[id] = {
                                macd: macd ? macd.value : null,
                                signal: signal ? signal.value : null,
                                hist: hist ? hist.value : null
                            };
                        }
                    });
                    setCrosshairValues(vals);
                }
            });
        }

        const handleResize = () => {
            if (chartContainerRef.current && chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
            if (rsiChartContainerRef.current && rsiChartRef.current) {
                rsiChartRef.current.applyOptions({ width: rsiChartContainerRef.current.clientWidth });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (chartRef.current) chartRef.current.remove();
            if (rsiChartRef.current) rsiChartRef.current.remove();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [onSeek]);

    // Handle realtime Main Chart Data injection on change
    useEffect(() => {
        if (!seriesRef.current || !volumeSeriesRef.current || !initialData) return;

        if (initialData.length > 0) {
            const formattedData = initialData.map((d: any) => ({
                ...d,
                time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time
            }));
            seriesRef.current.setData(formattedData);

            const volumeData = initialData.map((d: any) => ({
                time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time,
                value: d.volume || 0,
                color: d.close >= d.open ? '#00E676' : '#FF1744'
            }));
            volumeSeriesRef.current.setData(volumeData as any);
        } else {
            // clear chart if array is empty
            seriesRef.current.setData([]);
            volumeSeriesRef.current.setData([]);
        }
    }, [initialData]);

    // Handle Dynamic Indicators Mapping
    useEffect(() => {
        if (!chartRef.current || !rsiChartRef.current) return;
        const mainChart = chartRef.current;
        const subChart = rsiChartRef.current;

        const mainOverlayTypes = ['EMA', 'VWAP', 'BB', 'DAILY_LEVELS', 'VP'];
        const subOscillatorTypes = ['RSI', 'ATR', 'MACD'];

        const activeOverlays = activeIndicators.filter(i => mainOverlayTypes.includes(i.type));
        const activeOscillators = activeIndicators.filter(i => subOscillatorTypes.includes(i.type));

        const overlayIds = new Set(activeOverlays.map(i => i.id));
        const oscIds = new Set(activeOscillators.map(i => i.id));

        // Cleanup removed Main Overlays
        new Set(indicatorSeriesRef.current.keys()).forEach(key => {
            const isMatch = Array.from(overlayIds).some(baseId => key === baseId || key.startsWith(`${baseId}_`));
            if (!isMatch) {
                try { mainChart.removeSeries(indicatorSeriesRef.current.get(key)!); } catch (e) { }
                indicatorSeriesRef.current.delete(key);
            }
        });
        new Set(bbSeriesRef.current.keys()).forEach(id => {
            if (!overlayIds.has(id)) {
                try {
                    mainChart.removeSeries(bbSeriesRef.current.get(id)!.upper);
                    mainChart.removeSeries(bbSeriesRef.current.get(id)!.middle);
                    mainChart.removeSeries(bbSeriesRef.current.get(id)!.lower);
                } catch (e) { }
                bbSeriesRef.current.delete(id);
            }
        });

        // Cleanup removed Oscillators
        new Set(oscSeriesRef.current.keys()).forEach(id => {
            if (!oscIds.has(id)) {
                try { subChart.removeSeries(oscSeriesRef.current.get(id)!); } catch (e) { }
                oscSeriesRef.current.delete(id);
            }
        });
        new Set(macdSeriesRef.current.keys()).forEach(id => {
            if (!oscIds.has(id)) {
                try {
                    subChart.removeSeries(macdSeriesRef.current.get(id)!.macd);
                    subChart.removeSeries(macdSeriesRef.current.get(id)!.signal);
                    subChart.removeSeries(macdSeriesRef.current.get(id)!.hist);
                } catch (e) { }
                macdSeriesRef.current.delete(id);
            }
        });

        // Add / Update Active Overlays
        activeOverlays.forEach(ind => {
            if (ind.type === 'BB') {
                let bbGrp = bbSeriesRef.current.get(ind.id);
                if (!bbGrp) {
                    bbGrp = {
                        upper: mainChart.addLineSeries({ color: ind.color, lineWidth: 1, lineStyle: LineStyle.Dashed }),
                        middle: mainChart.addLineSeries({ color: ind.color, lineWidth: 1 }),
                        lower: mainChart.addLineSeries({ color: ind.color, lineWidth: 1, lineStyle: LineStyle.Dashed }),
                    };
                    bbSeriesRef.current.set(ind.id, bbGrp);
                }

                if (initialData && initialData.length > 0) {
                    const mappedU = initialData.filter(d => d[`${ind.id}_upper`] !== undefined && d[`${ind.id}_upper`] !== null).map(d => ({ time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time, value: d[`${ind.id}_upper`] }));
                    const mappedM = initialData.filter(d => d[`${ind.id}_middle`] !== undefined && d[`${ind.id}_middle`] !== null).map(d => ({ time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time, value: d[`${ind.id}_middle`] }));
                    const mappedL = initialData.filter(d => d[`${ind.id}_lower`] !== undefined && d[`${ind.id}_lower`] !== null).map(d => ({ time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time, value: d[`${ind.id}_lower`] }));
                    if (mappedU.length) bbGrp.upper.setData(mappedU as any);
                    if (mappedM.length) bbGrp.middle.setData(mappedM as any);
                    if (mappedL.length) bbGrp.lower.setData(mappedL as any);
                }
            } else if (ind.type === 'VP') {
                let vpPlugin = (indicatorSeriesRef.current as any).get(`${ind.id}_plugin`);

                if (!vpPlugin && seriesRef.current) {
                    vpPlugin = new VolumeProfilePlugin([]);
                    seriesRef.current.attachPrimitive(vpPlugin);
                    (indicatorSeriesRef.current as any).set(`${ind.id}_plugin`, vpPlugin);
                }

                if (initialData && initialData.length > 0 && vpPlugin) {
                    const vpSessions: VolumeProfileSession[] = [];
                    for (const d of initialData) {
                        const profileStr = d[`${ind.id}_profile`];
                        if (profileStr) {
                            try {
                                const profileData = typeof profileStr === 'string' ? JSON.parse(profileStr) : profileStr;
                                vpSessions.push({
                                    time: (typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time) as Time,
                                    profile: profileData,
                                    poc: d[`${ind.id}_poc`] as number,
                                    vah: d[`${ind.id}_vah`] as number,
                                    val: d[`${ind.id}_val`] as number
                                });
                            } catch (e) {
                                console.error("Could not parse VP profile", e);
                            }
                        }
                    }
                    if (vpSessions.length > 0) {
                        vpPlugin.setData(vpSessions);
                    }
                }
            } else if (ind.type === 'DAILY_LEVELS') {
                let series = indicatorSeriesRef.current.get(`${ind.id}_high`);
                let seriesLow = indicatorSeriesRef.current.get(`${ind.id}_low`);
                if (!series) {
                    series = mainChart.addLineSeries({ color: ind.color, lineWidth: 1, lineStyle: LineStyle.SparseDotted, title: 'PDH' });
                    indicatorSeriesRef.current.set(`${ind.id}_high`, series);
                }
                if (!seriesLow) {
                    seriesLow = mainChart.addLineSeries({ color: ind.color, lineWidth: 1, lineStyle: LineStyle.SparseDotted, title: 'PDL' });
                    indicatorSeriesRef.current.set(`${ind.id}_low`, seriesLow);
                }

                if (initialData && initialData.length > 0) {
                    const dataH = initialData.filter(d => d[`${ind.id}_prev_high`] !== undefined && d[`${ind.id}_prev_high`] !== null).map(d => ({ time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time, value: d[`${ind.id}_prev_high`] }));
                    const dataL = initialData.filter(d => d[`${ind.id}_prev_low`] !== undefined && d[`${ind.id}_prev_low`] !== null).map(d => ({ time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time, value: d[`${ind.id}_prev_low`] }));
                    if (dataH.length) series.setData(dataH as any);
                    if (dataL.length) seriesLow.setData(dataL as any);
                }
            } else {
                let series = indicatorSeriesRef.current.get(ind.id);
                if (!series) {
                    series = mainChart.addLineSeries({ color: ind.color, lineWidth: 1, title: `${ind.type} ${ind.params.length || ''}`.trim() });
                    indicatorSeriesRef.current.set(ind.id, series);
                }

                if (initialData && initialData.length > 0) {
                    const data = initialData.filter(d => d[ind.id] !== undefined && d[ind.id] !== null).map((d: any) => ({
                        time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time,
                        value: d[ind.id]
                    }));
                    if (data.length) series.setData(data as any);
                }
            }
        });

        // Add / Update Active Oscillators
        activeOscillators.forEach(ind => {
            if (ind.type === 'MACD') {
                let macdGrp = macdSeriesRef.current.get(ind.id);
                if (!macdGrp) {
                    macdGrp = {
                        macd: subChart.addLineSeries({ color: '#2962FF', lineWidth: 2, priceLineVisible: false }),
                        signal: subChart.addLineSeries({ color: '#FF6D00', lineWidth: 1, priceLineVisible: false }),
                        hist: subChart.addHistogramSeries({ color: '#26A69A', priceLineVisible: false })
                    };
                    macdSeriesRef.current.set(ind.id, macdGrp);
                }

                if (initialData && initialData.length > 0) {
                    const mData = initialData.filter(d => d[`${ind.id}_macd`] !== undefined && d[`${ind.id}_macd`] !== null).map(d => ({ time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time, value: d[`${ind.id}_macd`] }));
                    const sData = initialData.filter(d => d[`${ind.id}_signal`] !== undefined && d[`${ind.id}_signal`] !== null).map(d => ({ time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time, value: d[`${ind.id}_signal`] }));
                    const hData = initialData.filter(d => d[`${ind.id}_hist`] !== undefined && d[`${ind.id}_hist`] !== null).map(d => ({
                        time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time,
                        value: d[`${ind.id}_hist`],
                        color: d[`${ind.id}_hist`] >= 0 ? '#26A69A' : '#EF5350'
                    }));

                    if (mData.length) macdGrp.macd.setData(mData as any);
                    if (sData.length) macdGrp.signal.setData(sData as any);
                    if (hData.length) macdGrp.hist.setData(hData as any);
                }
            } else {
                let series = oscSeriesRef.current.get(ind.id);
                if (!series) {
                    series = subChart.addLineSeries({ color: ind.color, lineWidth: 1, priceLineVisible: false });
                    oscSeriesRef.current.set(ind.id, series);
                }

                if (initialData && initialData.length > 0) {
                    const data = initialData.filter(d => d[ind.id] !== undefined && d[ind.id] !== null).map((d: any) => ({
                        time: typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time,
                        value: d[ind.id]
                    }));
                    if (data.length) series.setData(data as any);
                }
            }
        });

        // Handle FVG Markers mapped directly onto the candle series
        const fvgs = activeIndicators.filter(i => i.type === 'FVG');
        if (seriesRef.current && initialData && initialData.length > 0) {
            let allMarkers: any[] = [];
            // add user trade markers
            if (markers) {
                allMarkers = [...markers];
            }

            // Loop through each FVG indicator requested
            fvgs.forEach(ind => {
                initialData.forEach(d => {
                    const tVal = typeof d.time === 'string' ? new Date(d.time).getTime() / 1000 : d.time;
                    if (d[`${ind.id}_bull`]) {
                        allMarkers.push({
                            time: tVal,
                            position: 'belowBar',
                            color: '#00E676',
                            shape: 'arrowUp',
                            text: 'FVG'
                        });
                    } else if (d[`${ind.id}_bear`]) {
                        allMarkers.push({
                            time: tVal,
                            position: 'aboveBar',
                            color: '#FF1744',
                            shape: 'arrowDown',
                            text: 'FVG'
                        });
                    }
                });
            });

            try {
                // sort markers by time as strictly required by lightweight charts
                allMarkers.sort((a, b) => a.time - b.time);
                // remove exact time duplicates if any
                const uniqueM = Array.from(new Map(allMarkers.map(m => [`${m.time}-${m.shape}`, m])).values());
                seriesRef.current.setMarkers(uniqueM as any);
            } catch (e) {
                console.error("Marker Error", e);
            }
        }

        // Toggle Sub Pane Visibility. If there's MACD, ATR, or RSI, we show it and expand height
        if (rsiChartContainerRef.current) {
            const hasSub = activeOscillators.length > 0;
            // E.g. 150px per oscillator
            const height = hasSub ? activeOscillators.length * 150 : 0;
            rsiChartContainerRef.current.style.height = `${height}px`;
            rsiChartContainerRef.current.style.display = hasSub ? 'block' : 'none';
            subChart.applyOptions({ height: height });
        }
    }, [activeIndicators, initialData, markers]);

    // Handle realtime lastCandle updates
    useEffect(() => {
        if (!lastCandle) return;
        const timeVal = (typeof lastCandle.time === 'string' ? new Date(lastCandle.time).getTime() / 1000 : lastCandle.time) as any;

        if (seriesRef.current) {
            try {
                const formattedCandle: any = { ...lastCandle, time: timeVal };
                seriesRef.current.update(formattedCandle);

                if (volumeSeriesRef.current && lastCandle.volume !== undefined) {
                    volumeSeriesRef.current.update({
                        time: timeVal,
                        value: lastCandle.volume,
                        color: lastCandle.close >= lastCandle.open ? '#00E676' : '#FF1744'
                    } as any);
                }

                // Update standard indicators
                try {
                    indicatorSeriesRef.current.forEach((series, id) => {
                        if (lastCandle[id] !== undefined && lastCandle[id] !== null) {
                            series.update({ time: timeVal, value: lastCandle[id] } as any);
                        } else if (id.includes('_high') || id.includes('_low') || id.includes('_poc') || id.includes('_vah') || id.includes('_val')) {
                            // Extracted custom modifiers
                            const baseId = id.replace('_high', '').replace('_low', '').replace('_poc', '').replace('_vah', '').replace('_val', '');
                            if (lastCandle[`${baseId}_prev_high`] !== undefined && id.includes('_high')) series.update({ time: timeVal, value: lastCandle[`${baseId}_prev_high`] } as any)
                            if (lastCandle[`${baseId}_prev_low`] !== undefined && id.includes('_low')) series.update({ time: timeVal, value: lastCandle[`${baseId}_prev_low`] } as any)
                            if (lastCandle[`${baseId}_poc`] !== undefined && id.includes('_poc')) series.update({ time: timeVal, value: lastCandle[`${baseId}_poc`] } as any)
                            if (lastCandle[`${baseId}_vah`] !== undefined && id.includes('_vah')) series.update({ time: timeVal, value: lastCandle[`${baseId}_vah`] } as any)
                            if (lastCandle[`${baseId}_val`] !== undefined && id.includes('_val')) series.update({ time: timeVal, value: lastCandle[`${baseId}_val`] } as any)
                        }
                    });
                } catch (e) { console.warn("Indicator update map failed", e); }

                // Update BB
                try {
                    bbSeriesRef.current.forEach((grp, id) => {
                        if (lastCandle[`${id}_upper`] !== undefined) grp.upper.update({ time: timeVal, value: lastCandle[`${id}_upper`] } as any);
                        if (lastCandle[`${id}_middle`] !== undefined) grp.middle.update({ time: timeVal, value: lastCandle[`${id}_middle`] } as any);
                        if (lastCandle[`${id}_lower`] !== undefined) grp.lower.update({ time: timeVal, value: lastCandle[`${id}_lower`] } as any);
                    });
                } catch (e) { }

                // Update standard oscillators
                try {
                    oscSeriesRef.current.forEach((series, id) => {
                        if (lastCandle[id] !== undefined && lastCandle[id] !== null) {
                            series.update({ time: timeVal, value: lastCandle[id] } as any);
                        }
                    });
                } catch (e) { }

                // Update MACD
                try {
                    macdSeriesRef.current.forEach((grp, id) => {
                        if (lastCandle[`${id}_macd`] !== undefined) grp.macd.update({ time: timeVal, value: lastCandle[`${id}_macd`] } as any);
                        if (lastCandle[`${id}_signal`] !== undefined) grp.signal.update({ time: timeVal, value: lastCandle[`${id}_signal`] } as any);
                        if (lastCandle[`${id}_hist`] !== undefined) grp.hist.update({
                            time: timeVal,
                            value: lastCandle[`${id}_hist`],
                            color: lastCandle[`${id}_hist`] >= 0 ? '#26A69A' : '#EF5350'
                        } as any);
                    });
                } catch (e) { }

            } catch (err) {
                console.warn("Error updating real-time candle:", err);
            }
        }
    }, [lastCandle]);

    // Legend Rendering Helpers
    const renderLegendItems = (indicators: IndicatorConfig[]) => {
        return indicators.map(ind => {
            const vals = crosshairValues[ind.id] || {};

            let displayVal = 'N/A';
            if (ind.type === 'BB') {
                const u = vals.upper !== undefined && vals.upper !== null ? vals.upper.toFixed(2) : '--';
                const m = vals.middle !== undefined && vals.middle !== null ? vals.middle.toFixed(2) : '--';
                const l = vals.lower !== undefined && vals.lower !== null ? vals.lower.toFixed(2) : '--';
                displayVal = `U:${u} M:${m} L:${l}`;
            } else if (ind.type === 'MACD') {
                const m = vals.macd !== undefined && vals.macd !== null ? vals.macd.toFixed(2) : '--';
                const s = vals.signal !== undefined && vals.signal !== null ? vals.signal.toFixed(2) : '--';
                const h = vals.hist !== undefined && vals.hist !== null ? vals.hist.toFixed(2) : '--';
                displayVal = `MACD:${m} SIG:${s} HIST:${h}`;
            } else if (ind.type === 'DAILY_LEVELS') {
                displayVal = ``;
            } else if (ind.type === 'FVG') {
                displayVal = ``;
            } else {
                displayVal = vals.val !== undefined && vals.val !== null ? vals.val.toFixed(2) : 'N/A';
            }

            return (
                <div key={ind.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span style={{ color: ind.color, fontWeight: 'bold' }}>
                        {ind.type} {ind.type !== 'VWAP' && ind.type !== 'DAILY_LEVELS' && ind.type !== 'FVG' ? Object.values(ind.params).join(',') : ''}
                    </span>
                    <span style={{ color: '#DDD' }}>{displayVal}</span>
                    {onRemoveIndicator && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveIndicator(ind.id);
                            }}
                            style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '0 2px' }}
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            );
        });
    };

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div ref={chartContainerRef} style={{ width: '100%', height: '500px', position: 'relative' }} />

            {/* Main Chart Legend Overlay */}
            {activeIndicators.filter(i => ['EMA', 'VWAP', 'BB', 'DAILY_LEVELS', 'FVG', 'VP'].includes(i.type)).length > 0 && (
                <div style={{
                    position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                    background: 'none', padding: '0.2rem', borderRadius: '0',
                    fontSize: '11px', pointerEvents: 'auto', fontFamily: 'monospace'
                }}>
                    {renderLegendItems(activeIndicators.filter(i => ['EMA', 'VWAP', 'BB', 'DAILY_LEVELS', 'FVG', 'VP'].includes(i.type)))}
                </div>
            )}

            <div
                ref={rsiChartContainerRef}
                style={{
                    width: '100%',
                    height: '0px',
                    display: 'none',
                    position: 'relative',
                    marginTop: '0px',
                    borderTop: '2px solid var(--border)'
                }}
            >
                {/* Sub Pane Legend Overlay */}
                {activeIndicators.filter(i => ['RSI', 'ATR', 'MACD'].includes(i.type)).length > 0 && (
                    <div style={{
                        position: 'absolute', top: '10px', left: '10px', zIndex: 10,
                        background: 'none', padding: '0.2rem', borderRadius: '0',
                        fontSize: '11px', pointerEvents: 'auto', fontFamily: 'monospace'
                    }}>
                        {renderLegendItems(activeIndicators.filter(i => ['RSI', 'ATR', 'MACD'].includes(i.type)))}
                    </div>
                )}
            </div>
        </div>
    );
};
