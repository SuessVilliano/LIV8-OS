/**
 * LocationSwitcher Component
 *
 * Allows agency users to switch between multiple locations/sub-accounts
 * Works with GHL multi-location and Vbout sub-accounts
 */

import { useState, useEffect, useRef } from 'react';
import {
    Building2,
    ChevronDown,
    Check,
    Plus,
    Loader2,
    MapPin,
    Settings,
    Users
} from 'lucide-react';
import { getBackendUrl } from '../services/api';

const API_BASE = getBackendUrl();

interface Location {
    id: string;
    name: string;
    type?: 'primary' | 'sub-account';
    address?: string;
    phone?: string;
    isActive: boolean;
    lastSynced?: string;
}

interface LocationSwitcherProps {
    compact?: boolean;
    onLocationChange?: (locationId: string) => void;
}

const LocationSwitcher: React.FC<LocationSwitcherProps> = ({ compact = false, onLocationChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [locations, setLocations] = useState<Location[]>([]);
    const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAgency, setIsAgency] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchLocations();
        checkAgencyStatus();

        // Close dropdown on outside click
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem('os_token');
            const currentLocId = localStorage.getItem('os_loc_id') || 'default';

            // Try to fetch locations from API
            const response = await fetch(`${API_BASE}/api/crm/locations`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.locations && data.locations.length > 0) {
                    setLocations(data.locations);
                    const current = data.locations.find((l: Location) => l.id === currentLocId) || data.locations[0];
                    setCurrentLocation(current);
                    return;
                }
            }

            // Fallback: create location from localStorage
            const businessName = localStorage.getItem('businessName') ||
                localStorage.getItem('os_brand_name') ||
                'My Business';

            const defaultLocation: Location = {
                id: currentLocId,
                name: businessName,
                type: 'primary',
                isActive: true
            };

            setLocations([defaultLocation]);
            setCurrentLocation(defaultLocation);

        } catch (error) {
            console.error('Failed to fetch locations:', error);
            // Set default location
            const defaultLocation: Location = {
                id: localStorage.getItem('os_loc_id') || 'default',
                name: localStorage.getItem('businessName') || 'My Business',
                type: 'primary',
                isActive: true
            };
            setLocations([defaultLocation]);
            setCurrentLocation(defaultLocation);
        } finally {
            setIsLoading(false);
        }
    };

    const checkAgencyStatus = () => {
        // Check if user has agency subscription
        const subscriptionData = localStorage.getItem('os_subscription');
        if (subscriptionData) {
            try {
                const subscription = JSON.parse(subscriptionData);
                setIsAgency(subscription.planId?.startsWith('agency_'));
            } catch {
                setIsAgency(false);
            }
        }

        // Also check GHL agency status
        const ghlData = localStorage.getItem('ghl_agency_id');
        if (ghlData) {
            setIsAgency(true);
        }
    };

    const switchLocation = (location: Location) => {
        if (location.id === currentLocation?.id) {
            setIsOpen(false);
            return;
        }

        // Update localStorage
        localStorage.setItem('os_loc_id', location.id);
        localStorage.setItem('businessName', location.name);

        setCurrentLocation(location);
        setIsOpen(false);

        // Notify parent
        if (onLocationChange) {
            onLocationChange(location.id);
        }

        // Reload page to refresh data for new location
        window.location.reload();
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 text-[var(--os-text-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
            </div>
        );
    }

    // Don't show if only one location and not an agency
    if (locations.length <= 1 && !isAgency) {
        return null;
    }

    if (compact) {
        return (
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 p-2 hover:bg-[var(--os-surface)] rounded-lg transition-all"
                    title={currentLocation?.name}
                >
                    <Building2 className="h-4 w-4 text-neuro" />
                    <ChevronDown className={`h-3 w-3 text-[var(--os-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="p-3 border-b border-[var(--os-border)]">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--os-text-muted)]">
                                Switch Location
                            </p>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {locations.map(location => (
                                <button
                                    key={location.id}
                                    onClick={() => switchLocation(location)}
                                    className={`w-full p-3 flex items-center gap-3 hover:bg-[var(--os-bg)] transition-all ${
                                        location.id === currentLocation?.id ? 'bg-neuro/5' : ''
                                    }`}
                                >
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                                        location.type === 'primary' ? 'bg-neuro/10 text-neuro' : 'bg-[var(--os-bg)] text-[var(--os-text-muted)]'
                                    }`}>
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-sm truncate">{location.name}</p>
                                        {location.address && (
                                            <p className="text-[10px] text-[var(--os-text-muted)] truncate">{location.address}</p>
                                        )}
                                    </div>
                                    {location.id === currentLocation?.id && (
                                        <Check className="h-4 w-4 text-neuro" />
                                    )}
                                </button>
                            ))}
                        </div>
                        {isAgency && (
                            <div className="p-3 border-t border-[var(--os-border)]">
                                <button className="w-full py-2 px-3 text-xs font-bold text-neuro hover:bg-neuro/5 rounded-lg transition-all flex items-center justify-center gap-2">
                                    <Plus className="h-3 w-3" />
                                    Add Location
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Full version for sidebar
    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 p-3 hover:bg-[var(--os-surface)] rounded-xl transition-all border border-transparent hover:border-[var(--os-border)]"
            >
                <div className="h-10 w-10 bg-gradient-to-br from-neuro to-neuro/60 rounded-xl flex items-center justify-center text-white">
                    <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                    <p className="font-bold text-sm truncate">{currentLocation?.name || 'Select Location'}</p>
                    <p className="text-[10px] text-[var(--os-text-muted)] flex items-center gap-1">
                        {currentLocation?.type === 'primary' ? (
                            <>
                                <MapPin className="h-2.5 w-2.5" />
                                Primary Account
                            </>
                        ) : (
                            <>
                                <Users className="h-2.5 w-2.5" />
                                Sub-Account
                            </>
                        )}
                    </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-[var(--os-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--os-surface)] border border-[var(--os-border)] rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-4 border-b border-[var(--os-border)] flex items-center justify-between">
                        <div>
                            <p className="font-bold text-sm">Your Locations</p>
                            <p className="text-[10px] text-[var(--os-text-muted)]">{locations.length} location{locations.length !== 1 ? 's' : ''}</p>
                        </div>
                        {isAgency && (
                            <button className="p-2 hover:bg-[var(--os-bg)] rounded-lg text-[var(--os-text-muted)] hover:text-neuro">
                                <Settings className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                        {locations.map(location => (
                            <button
                                key={location.id}
                                onClick={() => switchLocation(location)}
                                className={`w-full p-4 flex items-center gap-4 hover:bg-[var(--os-bg)] transition-all ${
                                    location.id === currentLocation?.id ? 'bg-neuro/5 border-l-2 border-neuro' : ''
                                }`}
                            >
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                                    location.type === 'primary'
                                        ? 'bg-gradient-to-br from-neuro to-neuro/60 text-white'
                                        : 'bg-[var(--os-bg)] text-[var(--os-text-muted)] border border-[var(--os-border)]'
                                }`}>
                                    <Building2 className="h-6 w-6" />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold truncate">{location.name}</p>
                                        {location.type === 'primary' && (
                                            <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 bg-neuro/10 text-neuro rounded">
                                                Primary
                                            </span>
                                        )}
                                    </div>
                                    {location.address && (
                                        <p className="text-xs text-[var(--os-text-muted)] truncate mt-0.5">{location.address}</p>
                                    )}
                                    {location.lastSynced && (
                                        <p className="text-[10px] text-[var(--os-text-muted)] mt-1">
                                            Last synced: {new Date(location.lastSynced).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                                {location.id === currentLocation?.id ? (
                                    <div className="h-8 w-8 bg-neuro rounded-full flex items-center justify-center text-white">
                                        <Check className="h-4 w-4" />
                                    </div>
                                ) : (
                                    <div className="h-8 w-8 border border-[var(--os-border)] rounded-full flex items-center justify-center text-[var(--os-text-muted)]">
                                        <ChevronDown className="h-4 w-4 -rotate-90" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {isAgency && (
                        <div className="p-4 border-t border-[var(--os-border)] bg-[var(--os-bg)]">
                            <button className="w-full py-3 px-4 bg-neuro/10 text-neuro rounded-xl font-bold text-sm hover:bg-neuro hover:text-white transition-all flex items-center justify-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add New Location
                            </button>
                            <p className="text-[10px] text-center text-[var(--os-text-muted)] mt-2">
                                Connect a new GHL sub-account or create a new location
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LocationSwitcher;
