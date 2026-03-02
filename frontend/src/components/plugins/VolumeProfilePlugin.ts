import {
    ISeriesPrimitive,
    ISeriesPrimitivePaneRenderer,
    ISeriesPrimitivePaneView,
    SeriesAttachedParameter,
    Time,
    SeriesType,
} from 'lightweight-charts';

export interface VolumeProfileBin {
    price: number;
    vol: number;
    low_bound: number;
    high_bound: number;
    in_va: boolean;
}

export interface VolumeProfileSession {
    time: Time;
    profile: VolumeProfileBin[];
    poc: number;
    vah: number;
    val: number;
}

export interface VolumeProfilePluginOptions {
    maxWidthPixels: number;
    colorVA: string;
    colorNonVA: string;
    colorPOC: string;
}

class VolumeProfileRenderer implements ISeriesPrimitivePaneRenderer {
    private _aggData: { bins: VolumeProfileBin[], maxVol: number, pocPrice: number };
    private _options: VolumeProfilePluginOptions;
    private _series: SeriesAttachedParameter<Time, SeriesType> | null;

    constructor(aggData: { bins: VolumeProfileBin[], maxVol: number, pocPrice: number }, options: VolumeProfilePluginOptions, series: SeriesAttachedParameter<Time, SeriesType> | null) {
        this._aggData = aggData;
        this._options = options;
        this._series = series;
    }

    draw(target: any): void {
        if (!this._series || this._aggData.bins.length === 0) return;

        target.useBitmapCoordinateSpace((scope: any) => {
            const ctx = scope.context;
            const width = scope.bitmapSize.width;

            const { bins: aggregatedBins, maxVol: aggMaxVol, pocPrice } = this._aggData;

            if (aggMaxVol === 0) return;

            const rightEdge = width;
            ctx.globalAlpha = 0.8;

            aggregatedBins.forEach(bin => {
                const s = this._series?.series as any;
                const yTop = s.priceToCoordinate(bin.high_bound) ?? 0;
                const yBottom = s.priceToCoordinate(bin.low_bound) ?? 0;

                // prices on chart are inverted (lower Y is higher price)
                const yStart = Math.min(yTop, yBottom);
                const yEnd = Math.max(yTop, yBottom);
                const rectHeight = Math.max(1, yEnd - yStart);

                // Width of the bin (scaled by device pixel ratio inside bitmap scope)
                const barWidth = (bin.vol / aggMaxVol) * this._options.maxWidthPixels * scope.horizontalPixelRatio;

                if (Math.abs(bin.price - pocPrice) < 0.0001) {
                    ctx.fillStyle = this._options.colorPOC;
                } else if (bin.in_va) {
                    ctx.fillStyle = this._options.colorVA;
                } else {
                    ctx.fillStyle = this._options.colorNonVA;
                }

                // Draw the rectangle starting from the right edge
                const xStart = rightEdge - barWidth;
                ctx.fillRect(xStart, yStart * scope.verticalPixelRatio, barWidth, rectHeight * scope.verticalPixelRatio);

                // Draw a thin separator line if requested
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.strokeRect(xStart, yStart * scope.verticalPixelRatio, barWidth, rectHeight * scope.verticalPixelRatio);
            });

            // Draw POC Line extending out
            const s = this._series?.series as any;
            const pocY = s.priceToCoordinate(pocPrice) ?? 0;
            if (pocY) {
                ctx.beginPath();
                ctx.moveTo(rightEdge, pocY * scope.verticalPixelRatio);
                ctx.lineTo(rightEdge - (this._options.maxWidthPixels * scope.horizontalPixelRatio * 1.5), pocY * scope.verticalPixelRatio);
                ctx.strokeStyle = this._options.colorPOC;
                ctx.lineWidth = 2 * scope.horizontalPixelRatio;
                ctx.stroke();
            }
        });
    }
}

class VolumeProfileView implements ISeriesPrimitivePaneView {
    private _aggData: { bins: VolumeProfileBin[], maxVol: number, pocPrice: number };
    private _options: VolumeProfilePluginOptions;
    private _series: SeriesAttachedParameter<Time, SeriesType> | null;

    constructor(aggData: { bins: VolumeProfileBin[], maxVol: number, pocPrice: number }, options: VolumeProfilePluginOptions, series: SeriesAttachedParameter<Time, SeriesType> | null) {
        this._aggData = aggData;
        this._options = options;
        this._series = series;
    }

    renderer(): ISeriesPrimitivePaneRenderer | null {
        return new VolumeProfileRenderer(this._aggData, this._options, this._series);
    }
}

export class VolumeProfilePlugin implements ISeriesPrimitive<Time> {
    private _aggData: { bins: VolumeProfileBin[], maxVol: number, pocPrice: number } = { bins: [], maxVol: 0, pocPrice: 0 };
    private _options: VolumeProfilePluginOptions;
    private _series: SeriesAttachedParameter<Time, SeriesType> | null = null;
    private _paneViews: VolumeProfileView[] = [];

    constructor(data: VolumeProfileSession[], options?: Partial<VolumeProfilePluginOptions>) {
        this._options = {
            maxWidthPixels: 150,
            colorVA: 'rgba(41, 98, 255, 0.7)',     // Blue for Value Area
            colorNonVA: 'rgba(255, 183, 77, 0.5)',  // Orange/Yellow for non-VA
            colorPOC: 'rgba(255, 235, 59, 1)',      // Bright Yellow for POC
            ...options,
        };
        this.setData(data);
    }

    private _computeAggregation(data: VolumeProfileSession[]) {
        const binMap = new Map<number, VolumeProfileBin>();
        let aggMaxVol = 0;

        data.forEach(session => {
            session.profile.forEach(bin => {
                const key = bin.price; // Approximate merging by center price
                if (!binMap.has(key)) {
                    binMap.set(key, { ...bin });
                } else {
                    const existing = binMap.get(key)!;
                    existing.vol += bin.vol;
                    // in_va isn't strictly additive, but for aggregated we can just guess
                    existing.in_va = existing.in_va || bin.in_va;
                }
            });
        });

        const aggregatedBins = Array.from(binMap.values());

        aggregatedBins.forEach(b => {
            if (b.vol > aggMaxVol) aggMaxVol = b.vol;
        });

        let pocPrice = 0;
        let highestVol = 0;
        aggregatedBins.forEach(b => {
            if (b.vol > highestVol) {
                highestVol = b.vol;
                pocPrice = b.price;
            }
        });

        this._aggData = {
            bins: aggregatedBins,
            maxVol: aggMaxVol,
            pocPrice
        };
    }

    setData(data: VolumeProfileSession[]) {
        this._computeAggregation(data);
        this.updateAllViews();
    }

    attached({ requestUpdate, chart, series }: SeriesAttachedParameter<Time, SeriesType>): void {
        this._series = { requestUpdate, chart, series };
        this.updateAllViews();
        this._series.requestUpdate();
    }

    detached(): void {
        this._series = null;
    }

    paneViews(): readonly ISeriesPrimitivePaneView[] {
        return this._paneViews;
    }

    updateAllViews() {
        this._paneViews = [new VolumeProfileView(this._aggData, this._options, this._series)];
    }
}
