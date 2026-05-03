import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useMap, useMapEvents, Marker, Rectangle } from 'react-leaflet';
import L from 'leaflet';
import { FileUp, X, Check, Trash2, Crop, RotateCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PlanOverlayToolProps {
    active: boolean;
}

interface Point2D {
    x: number;
    y: number;
}

interface Anchors {
    img1: Point2D | null;
    img2: Point2D | null;
    map1: L.LatLng | null;
    map2: L.LatLng | null;
}

const PlanOverlayTool: React.FC<PlanOverlayToolProps> = ({ active }) => {
    const map = useMap();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [step, setStep] = useState<'upload' | 'p1-img' | 'p1-map' | 'p2-img' | 'p2-map' | 'ready' | 'done' | 'crop-map-p1' | 'crop-map-p2'>('upload');
    const [anchors, setAnchors] = useState<Anchors>({ img1: null, img2: null, map1: null, map2: null });

    // Crop States
    const [mapCropP1, setMapCropP1] = useState<L.LatLng | null>(null);
    const [currentMousePos, setCurrentMousePos] = useState<L.LatLng | null>(null);

    const [clipStyle, setClipStyle] = useState<string>('');
    const [opacity, setOpacity] = useState(0.7);
    const [showPlanModal, setShowPlanModal] = useState(false);

    // Reset when tool becomes inactive
    useEffect(() => {
        if (!active) {
            // Optional cleanup
        }
    }, [active]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log("File upload triggered");
        const file = e.target.files?.[0];
        if (!file) {
            console.log("No file selected");
            return;
        }
        console.log("File selected:", file.name, file.type);

        try {
            if (file.type === 'application/pdf') {
                console.log("Processing PDF...");
                const arrayBuffer = await file.arrayBuffer();

                // Ensure worker is set
                if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
                }

                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                if (context) {
                    // @ts-ignore
                    await page.render({ canvasContext: context, viewport }).promise;
                    setImageSrc(canvas.toDataURL());
                    setStep('p1-img');
                    setShowPlanModal(true);
                }
            } else {
                console.log("Processing Image...");
                const reader = new FileReader();
                reader.onload = (event) => {
                    if (event.target?.result) {
                        setImageSrc(event.target.result as string);
                        setStep('p1-img');
                        setShowPlanModal(true);
                    }
                };
                reader.onerror = (err) => console.error("FileReader error:", err);
                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error("Error handling file upload:", error);
            alert("Failed to load plan: " + (error as Error).message);
        }
    };

    const handlePlanClick = (e: React.MouseEvent<HTMLImageElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Calculate actual pixel coordinates based on natural size
        const img = e.currentTarget;
        const scaleX = img.naturalWidth / rect.width;
        const scaleY = img.naturalHeight / rect.height;
        const pixelX = x * scaleX;
        const pixelY = y * scaleY;

        if (step === 'p1-img') {
            setAnchors(prev => ({ ...prev, img1: { x: pixelX, y: pixelY } }));
            setStep('p1-map');
            setShowPlanModal(false); // Hide modal to pick on map
        } else if (step === 'p2-img') {
            setAnchors(prev => ({ ...prev, img2: { x: pixelX, y: pixelY } }));
            setStep('p2-map');
            setShowPlanModal(false);
        }
    };

    // Helper to convert Map Point (LayerPoint) to Image Point (Pixel)
    const mapToImagePoint = (mapPoint: L.Point): Point2D | null => {
        if (!anchors.map1 || !anchors.map2 || !anchors.img1 || !anchors.img2) return null;

        const p1 = map.latLngToLayerPoint(anchors.map1);
        const p2 = map.latLngToLayerPoint(anchors.map2);
        const imgP1 = anchors.img1;
        const imgP2 = anchors.img2;

        const dxMap = p2.x - p1.x;
        const dyMap = p2.y - p1.y;
        const distMap = Math.sqrt(dxMap * dxMap + dyMap * dyMap);
        const angleMap = Math.atan2(dyMap, dxMap);

        const dxImg = imgP2.x - imgP1.x;
        const dyImg = imgP2.y - imgP1.y;
        const distImg = Math.sqrt(dxImg * dxImg + dyImg * dyImg);
        const angleImg = Math.atan2(dyImg, dxImg);

        const scale = distMap / distImg;
        const rotation = angleMap - angleImg;

        // Inverse Transform Logic
        const dx = mapPoint.x - p1.x;
        const dy = mapPoint.y - p1.y;

        // Rotate (-rotation)
        const cos = Math.cos(-rotation);
        const sin = Math.sin(-rotation);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;

        // Scale (1/scale)
        const sx = rx / scale;
        const sy = ry / scale;

        // Translate (+imgP1)
        return {
            x: sx + imgP1.x,
            y: sy + imgP1.y
        };
    };

    useMapEvents({
        mousemove(e) {
            if (step === 'crop-map-p2') {
                setCurrentMousePos(e.latlng);
            }
        },
        click(e) {
            if (!active) return;

            if (step === 'p1-map') {
                setAnchors(prev => ({ ...prev, map1: e.latlng }));
                setStep('p2-img');
                setShowPlanModal(true);
            } else if (step === 'p2-map') {
                setAnchors(prev => ({ ...prev, map2: e.latlng }));
                setStep('ready');
            } else if (step === 'crop-map-p1') {
                setMapCropP1(e.latlng); // Store map point for visual rect
                setStep('crop-map-p2');
            } else if (step === 'crop-map-p2') {
                if (!mapCropP1) return;

                // Get the 4 corners of the map rectangle
                const bounds = L.latLngBounds(mapCropP1, e.latlng);
                const nw = bounds.getNorthWest();
                const ne = bounds.getNorthEast();
                const se = bounds.getSouthEast();
                const sw = bounds.getSouthWest();

                const p1Img = mapToImagePoint(map.latLngToLayerPoint(nw));
                const p2Img = mapToImagePoint(map.latLngToLayerPoint(ne));
                const p3Img = mapToImagePoint(map.latLngToLayerPoint(se));
                const p4Img = mapToImagePoint(map.latLngToLayerPoint(sw));

                if (p1Img && p2Img && p3Img && p4Img) {
                    // Create polygon clip-path
                    const clip = `polygon(${p1Img.x}px ${p1Img.y}px, ${p2Img.x}px ${p2Img.y}px, ${p3Img.x}px ${p3Img.y}px, ${p4Img.x}px ${p4Img.y}px)`;
                    setClipStyle(clip);
                    setStep('done');
                    // Reset visual crop states
                    setMapCropP1(null);
                    setCurrentMousePos(null);
                }
            }
        }
    });

    const reset = () => {
        setImageSrc(null);
        setStep('upload');
        setAnchors({ img1: null, img2: null, map1: null, map2: null });
        setClipStyle('');
        setMapCropP1(null);
        setCurrentMousePos(null);
    };

    const resetCrop = () => {
        setClipStyle('');
        setMapCropP1(null);
        setCurrentMousePos(null);
    };

    const startCrop = () => {
        setStep('crop-map-p1');
        setMapCropP1(null);
        setCurrentMousePos(null);
    };

    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (panelRef.current) {
            L.DomEvent.disableClickPropagation(panelRef.current);
            L.DomEvent.disableScrollPropagation(panelRef.current);
        }
    }, [active]);

    if (!active && step !== 'done' && !step.startsWith('crop-map')) return null;

    return (
        <>
            {/* Control Panel */}
            {active && (
                <div
                    ref={panelRef}
                    className="fixed bottom-20 left-20 bg-white p-4 rounded-lg shadow-xl z-[1000] w-80 border border-gray-200"
                >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <FileUp size={18} /> Plan Overlay
                        </h3>
                        <button onClick={reset} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>

                    {step === 'upload' && (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="plan-upload"
                            />
                            <label htmlFor="plan-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <FileUp size={32} className="text-blue-500" />
                                <span className="text-sm text-gray-600 font-medium">Click to Upload Plan</span>
                                <span className="text-xs text-gray-400">PDF or Image</span>
                            </label>
                        </div>
                    )}

                    {step !== 'upload' && step !== 'done' && step !== 'ready' && !step.startsWith('crop-map') && (
                        <div className="space-y-3">
                            <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm border border-blue-100">
                                {step === 'p1-img' && "1. Click Point A on the Plan"}
                                {step === 'p1-map' && "2. Click Point A on the Map"}
                                {step === 'p2-img' && "3. Click Point B on the Plan"}
                                {step === 'p2-map' && "4. Click Point B on the Map"}
                            </div>
                            {showPlanModal ? (
                                <button onClick={() => setShowPlanModal(false)} className="w-full py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm">Hide Plan</button>
                            ) : (
                                <button onClick={() => setShowPlanModal(true)} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm">Show Plan</button>
                            )}
                        </div>
                    )}

                    {step === 'ready' && (
                        <div className="space-y-3">
                            <div className="bg-green-50 text-green-800 p-3 rounded text-sm border border-green-100 flex items-center gap-2">
                                <Check size={16} />
                                <span>Points Selected! Ready to align.</span>
                            </div>
                            <button
                                onClick={() => setStep('done')}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded font-bold shadow-md transform transition-transform hover:scale-105"
                            >
                                Align Plan
                            </button>
                            <button onClick={reset} className="w-full py-2 text-gray-500 hover:text-red-500 text-sm">Cancel</button>
                        </div>
                    )}

                    {(step === 'done' || step.startsWith('crop-map')) && (
                        <div className="space-y-4">
                            {step.startsWith('crop-map') && (
                                <div className="bg-orange-50 text-orange-800 p-3 rounded text-sm border border-orange-100">
                                    {step === 'crop-map-p1' ? "Click 1st corner on MAP" : "Click 2nd corner on MAP"}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Opacity</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    value={opacity}
                                    onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            <div className="flex gap-2">
                                {step === 'done' ? (
                                    <button onClick={startCrop} className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-sm flex items-center justify-center gap-1">
                                        <Crop size={14} /> Crop
                                    </button>
                                ) : (
                                    <button onClick={() => setStep('done')} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-sm">
                                        Cancel Crop
                                    </button>
                                )}
                                <button onClick={resetCrop} className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded text-sm" title="Reset Crop">
                                    <RotateCcw size={14} />
                                </button>
                            </div>

                            <div className="flex gap-2">
                                <button onClick={() => setStep('p1-img')} className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded text-sm">Re-align</button>
                                <button onClick={reset} className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded text-sm">Remove</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Plan Modal for Point Selection */}
            {showPlanModal && imageSrc && (
                <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-8">
                    <div className="bg-white rounded-lg shadow-2xl max-w-full max-h-full overflow-auto relative flex flex-col">
                        <div className="p-2 bg-gray-800 text-white flex justify-between items-center sticky top-0 z-10">
                            <span className="font-medium pl-2">Select Reference Point</span>
                            <button onClick={() => setShowPlanModal(false)} className="p-1 hover:bg-gray-700 rounded"><X size={20} /></button>
                        </div>
                        <div className="relative cursor-crosshair">
                            <img
                                src={imageSrc}
                                alt="Plan"
                                onClick={handlePlanClick}
                                className="max-w-none"
                            />
                            {anchors.img1 && (
                                <div
                                    className="absolute w-4 h-4 bg-red-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{
                                        left: (anchors.img1.x / ((document.querySelector('img[alt="Plan"]') as HTMLImageElement)?.naturalWidth || 1)) * ((document.querySelector('img[alt="Plan"]') as HTMLImageElement)?.clientWidth || 1),
                                        top: (anchors.img1.y / ((document.querySelector('img[alt="Plan"]') as HTMLImageElement)?.naturalHeight || 1)) * ((document.querySelector('img[alt="Plan"]') as HTMLImageElement)?.clientHeight || 1)
                                    }}
                                >
                                    <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-red-500 text-white text-xs px-1 rounded">A</span>
                                </div>
                            )}
                            {anchors.img2 && (
                                <div
                                    className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{
                                        left: (anchors.img2.x / ((document.querySelector('img[alt="Plan"]') as HTMLImageElement)?.naturalWidth || 1)) * ((document.querySelector('img[alt="Plan"]') as HTMLImageElement)?.clientWidth || 1),
                                        top: (anchors.img2.y / ((document.querySelector('img[alt="Plan"]') as HTMLImageElement)?.naturalHeight || 1)) * ((document.querySelector('img[alt="Plan"]') as HTMLImageElement)?.clientHeight || 1)
                                    }}
                                >
                                    <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white text-xs px-1 rounded">B</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Map Markers for Selection */}
            {anchors.map1 && (
                <Marker position={anchors.map1} icon={L.divIcon({ className: 'bg-transparent', html: '<div class="w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow-md"></div>' })} />
            )}
            {anchors.map2 && (
                <Marker position={anchors.map2} icon={L.divIcon({ className: 'bg-transparent', html: '<div class="w-4 h-4 bg-blue-500 border-2 border-white rounded-full shadow-md"></div>' })} />
            )}

            {/* Visual Crop Rectangle */}
            {step === 'crop-map-p2' && mapCropP1 && currentMousePos && (
                <Rectangle
                    bounds={[mapCropP1, currentMousePos]}
                    pathOptions={{ color: 'red', weight: 2, fillOpacity: 0.1, dashArray: '5, 5' }}
                />
            )}

            {/* Georeferenced Overlay */}
            {step === 'done' || step.startsWith('crop-map') && imageSrc && anchors.img1 && anchors.img2 && anchors.map1 && anchors.map2 ? (
                <GeoreferencedImage
                    imageSrc={imageSrc}
                    anchors={{
                        img1: anchors.img1,
                        img2: anchors.img2,
                        map1: anchors.map1,
                        map2: anchors.map2
                    }}
                    opacity={opacity}
                    clipStyle={clipStyle}
                />
            ) : null}
        </>
    );
};

interface GeoImageProps {
    imageSrc: string;
    anchors: {
        img1: Point2D;
        img2: Point2D;
        map1: L.LatLng;
        map2: L.LatLng;
    };
    opacity: number;
    clipStyle?: string;
}

const GeoreferencedImage: React.FC<GeoImageProps> = ({ imageSrc, anchors, opacity, clipStyle }) => {
    const map = useMap();
    const imgRef = useRef<HTMLImageElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});

    const updateTransformLayer = () => {
        if (!imgRef.current) return;

        const p1 = map.latLngToLayerPoint(anchors.map1);
        const p2 = map.latLngToLayerPoint(anchors.map2);

        const imgP1 = anchors.img1;
        const imgP2 = anchors.img2;

        const dxMap = p2.x - p1.x;
        const dyMap = p2.y - p1.y;
        const distMap = Math.sqrt(dxMap * dxMap + dyMap * dyMap);
        const angleMap = Math.atan2(dyMap, dxMap);

        const dxImg = imgP2.x - imgP1.x;
        const dyImg = imgP2.y - imgP1.y;
        const distImg = Math.sqrt(dxImg * dxImg + dyImg * dyImg);
        const angleImg = Math.atan2(dyImg, dxImg);

        const scale = distMap / distImg;
        const rotation = angleMap - angleImg;

        setStyle({
            position: 'absolute',
            left: 0,
            top: 0,
            transformOrigin: '0 0',
            transform: `translate(${p1.x}px, ${p1.y}px) rotate(${rotation}rad) scale(${scale}) translate(${-imgP1.x}px, ${-imgP1.y}px)`,
            opacity: opacity,
            pointerEvents: 'none',
            zIndex: 500,
            maxWidth: 'none',
            maxHeight: 'none',
            clipPath: clipStyle || 'none'
        });
    };

    // Use Layer Point strategy for smoother panning
    useMapEvents({
        zoom: updateTransformLayer,
        viewreset: updateTransformLayer,
        moveend: updateTransformLayer
    });

    // Update when map is ready or opacity changes
    useEffect(() => {
        updateTransformLayer();
    }, [opacity, clipStyle]);

    const [container, setContainer] = useState<HTMLElement | null>(null);

    useEffect(() => {
        // Create custom pane to ensure it's on top of all other layers
        let pane = map.getPane('planOverlayPane');
        if (!pane) {
            pane = map.createPane('planOverlayPane');
            // Standard OverlayPane is 400, MarkerPane is 600, PopupPane is 700.
            // Setting to 1000 ensures it's on top of everything.
            pane.style.zIndex = '1000';
            // Ensure clicks pass through the pane itself (image might have its own pointer-events)
            pane.style.pointerEvents = 'none';
        }
        setContainer(pane);
    }, [map]);

    if (!container || !imageSrc) return null;

    // Use React Portal to render into the overlay pane
    return createPortal(
        <img
            ref={imgRef}
            src={imageSrc}
            alt="Overlay"
            style={style}
            onLoad={updateTransformLayer}
        />,
        container
    );
};

export default PlanOverlayTool;
