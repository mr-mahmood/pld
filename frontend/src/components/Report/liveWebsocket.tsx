"use client";

import { Gate } from "@/src/types/gate";
import { useActiveUser } from "@/src/contexts/active_user_context";
import { Area } from "@/src/types/area";
import { useState, useEffect, useRef, useCallback } from "react";
import { AccessHistory } from "@/src/types/accessHistory";

export default function GateReport() {
    const { activeUser } = useActiveUser();

    // Flatten all gates from all areas with area context
    const gatesWithArea: { gate: Gate; area: Area }[] = activeUser?.areas?.flatMap(area =>
        area.gates.map(gate => ({ gate, area }))
    ) || [];

    const [selectedGate, setSelectedGate] = useState<{ gate: Gate; area: Area } | null>(
        gatesWithArea.length > 0 ? gatesWithArea[0] : null
    );

    // State to store events for each gate
    const [gateEvents, setGateEvents] = useState<Map<number, AccessHistory[]>>(new Map());

    // WebSocket connections ref
    const webSocketsRef = useRef<Map<number, WebSocket>>(new Map());

    // Track gates that are currently connecting to prevent duplicate connections
    const connectingGatesRef = useRef<Set<number>>(new Set());

    // Store carousel instances
    const carouselInstancesRef = useRef<Map<number, any>>(new Map());

    // Maximum number of events to keep per gate
    const MAX_EVENTS_PER_GATE = 20;

    const handleGateClick = useCallback((gateId: number) => {
        console.log(`Gate ID: ${gateId}`);
        const gate = gatesWithArea.find(item => item.gate.id === gateId);
        if (gate) {
            setSelectedGate(gate);
        }
    }, [gatesWithArea]);

    // Function to safely close a WebSocket connection
    const closeWebSocket = useCallback((gateId: number) => {
        const socket = webSocketsRef.current.get(gateId);
        if (socket) {
            // Remove event listeners first
            socket.onopen = null;
            socket.onclose = null;
            socket.onerror = null;
            socket.onmessage = null;

            // Close only if open or connecting
            if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
                socket.close(1000, "Normal closure");
            }

            webSocketsRef.current.delete(gateId);
            connectingGatesRef.current.delete(gateId);

            console.log(`WebSocket cleaned up for gate ${gateId}`);
        }
    }, []);

    // Connect to WebSocket for selected gate
    useEffect(() => {
        if (!selectedGate) return;

        const gateId = selectedGate.gate.id;

        // Prevent duplicate connections
        if (webSocketsRef.current.has(gateId) || connectingGatesRef.current.has(gateId)) {
            const existingSocket = webSocketsRef.current.get(gateId);
            if (existingSocket?.readyState === WebSocket.OPEN) {
                console.log(`WebSocket already connected for gate ${gateId}`);
                return;
            }
        }

        // Mark gate as connecting
        connectingGatesRef.current.add(gateId);

        console.log(`Creating WebSocket connection for gate ${gateId}`);
        const socket = new WebSocket(`ws://localhost:8000/ws/access-events/${gateId}/`);

        socket.onopen = () => {
            console.log(`✅ WebSocket connected for gate ${gateId}`);
            connectingGatesRef.current.delete(gateId);
            webSocketsRef.current.set(gateId, socket);
        };

        socket.onclose = (event) => {
            console.log(`🔴 WebSocket disconnected for gate ${gateId}`, {
                code: event.code,
                reason: event.reason,
                wasClean: event.wasClean
            });
            webSocketsRef.current.delete(gateId);
            connectingGatesRef.current.delete(gateId);
        };

        socket.onerror = (err) => {
            console.error(`❌ WebSocket error for gate ${gateId}:`, err);
            connectingGatesRef.current.delete(gateId);
        };

        socket.onmessage = (event) => {
            try {
                const data: AccessHistory = JSON.parse(event.data);
                console.log(data)

                setGateEvents(prev => {
                    const newMap = new Map(prev);
                    const currentEvents = newMap.get(gateId) || [];

                    // Check if this event ID already exists in recent events
                    const eventExists = currentEvents.some(
                        existingEvent => existingEvent.id === data.id
                    );

                    if (!eventExists) {
                        // Add new event and limit the total number
                        const updatedEvents = [data, ...currentEvents].slice(0, MAX_EVENTS_PER_GATE);
                        newMap.set(gateId, updatedEvents);
                        console.log(`📨 New event for gate ${gateId}:`, data.id);
                    } else {
                        console.log(`🔄 Duplicate event ignored for gate ${gateId}:`, data.id);
                    }

                    return newMap;
                });
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        // Cleanup function
        return () => {
            closeWebSocket(gateId);
        };
    }, [selectedGate?.gate.id, closeWebSocket]);

    // Get events for current gate
    const currentGateEvents = selectedGate ? gateEvents.get(selectedGate.gate.id) || [] : [];

    // Cleanup all WebSockets on component unmount
    useEffect(() => {
        return () => {
            console.log('Cleaning up all WebSocket connections');
            const gateIds = Array.from(webSocketsRef.current.keys());
            gateIds.forEach(gateId => {
                closeWebSocket(gateId);
            });
            webSocketsRef.current.clear();
            connectingGatesRef.current.clear();

            // Cleanup carousels
            carouselInstancesRef.current.forEach((instance) => {
                if (instance && typeof instance.dispose === 'function') {
                    instance.dispose();
                }
            });
            carouselInstancesRef.current.clear();
        };
    }, [closeWebSocket]);

    // Helper function to format Persian date
    const formatPersianDate = (timestamp: string) => {
        try {
            const date = new Date(timestamp);
            return date.toLocaleDateString('fa-IR') + ' ' + date.toLocaleTimeString('fa-IR') ;
        } catch {
            return 'تاریخ نامعتبر';
        }
    };

    // Helper function to get user role (handles null)
    const { getRoleInFarsi } = useActiveUser();
    const getUserRole = (user: any) => {
        if (!user) return "ناشناس";
        return getRoleInFarsi(user.role);
    };

    return (
        <div className="row">
            <div className="col-md-3">
                <div className="card hover-effect b-r-25 cards-scrollable" style={{ height: '41vh' }}>
                    <div className="card-header">
                        <h5>گیت ها (محوطه)</h5>
                    </div>
                    <div className="card-body">
                        <div className="vertical-tab setting-tab">
                            <ul className="nav nav-tabs tab-light-info m-0 flex-column" id="v-bg" role="tablist">
                                {gatesWithArea.map(({ gate, area }) => (
                                    <li className="nav-item w-100 mb-2" key={gate.id} role="presentation">
                                        <button
                                            aria-controls={`tab-${gate.id}`}
                                            aria-selected={selectedGate?.gate.id === gate.id}
                                            className={`nav-link b-r-25 w-100 text-start ${selectedGate?.gate.id === gate.id ? 'active' : ''}`}
                                            data-bs-target={`#tab-${gate.id}-pane`}
                                            data-bs-toggle="tab"
                                            id={`tab-${gate.id}`}
                                            role="tab"
                                            type="button"
                                            onClick={() => handleGateClick(gate.id)}
                                        >
                                            <i className="ph-bold ph-door pe-2"></i>
                                            {gate.name} ({area.name})
                                        </button>
                                    </li>
                                ))}

                                {gatesWithArea.length === 0 && (
                                    <li className="nav-item">
                                        <div className="alert alert-info m-3">
                                            هیچ گیت دسترسی برای شما تعریف نشده است
                                        </div>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Gate Information Card */}
                {selectedGate && (
                    <div className="card hover-effect mt-3 b-r-25 cards-scrollable" style={{ height: '40vh' }}>
                        <div className="card-header">
                            <h5>اطلاعات گیت</h5>
                        </div>
                        <div className="card-body ">
                            <div className="about-list">
                                <div className="about-list-item">
                                    <span className="about-list-label">
                                        <i className="ti ti-id"></i> شناسه:
                                    </span>
                                    <span className="about-list-value">
                                        {selectedGate.gate.id}
                                    </span>
                                </div>
                                <div className="about-list-item">
                                    <span className="about-list-label">
                                        <i className="ti ti-building"></i> محوطه:
                                    </span>
                                    <span className="about-list-value">
                                        {selectedGate.area.name}
                                    </span>
                                </div>
                                <div className="about-list-item">
                                    <span className="about-list-label">
                                        <i className="ti ti-door"></i> گیت:
                                    </span>
                                    <span className="about-list-value">
                                        {selectedGate.gate.name}
                                    </span>
                                </div>
                                <div className="about-list-item">
                                    <span className="about-list-label">
                                        <i className="ti ti-camera"></i> دوربین:
                                    </span>
                                    <span className="about-list-value">
                                        {selectedGate.gate.camera || 'ندارد'}
                                    </span>
                                </div>
                                <div className="about-list-item">
                                    <span className="about-list-label">
                                        <i className="ti ti-circle-check"></i> نقش:
                                    </span>
                                    <div style={{ justifySelf: "end" }}>
                                        {(() => {
                                            if (selectedGate.gate.role === "ENTERY") {
                                                return (
                                                    <span className="badge text-light-cyan b-r-25 f-s-17">
                                                        <i className="ti ti-door-enter"></i> ورودی
                                                    </span>
                                                );
                                            } else if (selectedGate.gate.role === "EXIT") {
                                                return (
                                                    <span className="badge text-light-dark-orange b-r-25 f-s-17">
                                                        <i className="ti ti-door-exit"></i> خروجی
                                                    </span>
                                                );
                                            } else if (selectedGate.gate.role === "SURVEILLANCE") {
                                                return (
                                                    <span className="badge text-light-see-blue b-r-25 f-s-17">
                                                        <i className="ti ti-device-computer-camera"></i> نظارت
                                                    </span>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Content Area - Scrollable Events */}
            <div className="col-md-9 cards-scrollable" style={{ height: '86vh' }}>
                {currentGateEvents.length === 0 ? (
                    <></>
                ) : (
                    <div className="row">
                        {currentGateEvents.map((event) => (
                            <div className="col-md-4 mb-0" key={event.id}>
                                <div className={`card book-mark-card hover-effect b-r-25 ${event.status === 'ALLOWED' ? 'b-s-4-success' : 'b-s-4-danger'}`}>
                                    <div className={`card-body`}>
                                        {/* Original Image */}
                                        {event.original_image && (
                                            <div className="mb-1">
                                                <img
                                                    alt="تصویر اصلی"
                                                    className="w-100 d-block b-r-25"
                                                    src={event.original_image}
                                                    style={{ border: '2px solid #ddd' }}
                                                    loading="lazy"
                                                />
                                                <div className="text-center mt-1">
                                                    <small className="text-muted">تصویر اصلی</small>
                                                </div>
                                            </div>
                                        )}

                                        {/* Generated Image */}
                                        {event.generated_image && (
                                            <div className="mb-0">
                                                <img
                                                    alt="پلاک تشخیص داده شده"
                                                    className="w-100 d-block"
                                                    src={event.generated_image}
                                                    loading="lazy"
                                                />
                                                <div className="text-center mt-1">
                                                    <small className="text-muted">پلاک تشخیص داده شده</small>
                                                </div>
                                            </div>
                                        )}

                                        {/* Info Section */}
                                        <div className="about-list">
                                            {/* Single row item */}
                                            <div className="row" style={{ width: '100% ' }}>
                                                {event.status === 'ALLOWED' ? (
                                                    <span className="badge float-end text-light-success b-r-25 f-w-500 f-s-16 mt-0 mb-1">دسترسی مجاز</span>
                                                ) : (
                                                    <span className="badge float-end text-light-danger b-r-25 f-w-500 f-s-16 mt-0 mb-1">دسترسی غیر مجاز</span>
                                                )}
                                            </div>

                                            {/* Row 1: Name and Employee Code */}
                                            <div className="about-list-row" style={{ borderTop: '1px solid #dee2e6', paddingTop: '0.5rem' }}>
                                                <span className="label-col">نام:</span>
                                                <span className="value-col">
                                                    {event.user?.first_name || event.user?.last_name ?
                                                        `${event.user?.first_name || ''} ${event.user?.last_name || ''} (${getUserRole(event.user)})`.trim()
                                                        :
                                                        '---'
                                                    }
                                                </span>
                                                <span className="separator-col">|</span>
                                                <span className="label-col" >کد پرسنلی:</span>
                                                <span className="value-col">
                                                    {event.user?.employe_number || '---'}
                                                </span>
                                            </div>

                                            {/* Row 2: Area and Gate */}
                                            <div className="about-list-row">
                                                <span className="label-col">محوطه:</span>
                                                <span className="value-col">
                                                    {event.area?.name || '---'}
                                                </span>
                                                <span className="separator-col">|</span>
                                                <span className="label-col">گیت:</span>
                                                <span className="value-col">
                                                    {event.gate?.name || '---'}
                                                </span>
                                            </div>

                                            {/* Row 3: Date and Confidence */}
                                            <div className="about-list-row">
                                                <span className="label-col">تاریخ:</span>
                                                <span className="value-col">
                                                    {formatPersianDate(event.timestamp)}
                                                </span>
                                                <span className="separator-col">|</span>
                                                <span className="label-col">اطمینان:</span>
                                                <span className="value-col">
                                                    {event.confidence != null ? `% ${Math.round(event.confidence * 100)}` : '---'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}