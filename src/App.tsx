/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Map, Marker } from 'pigeon-maps';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  AlertCircle, 
  MapPin, 
  Settings, 
  User, 
  Phone, 
  Mic, 
  MicOff, 
  Bell, 
  LogOut,
  ChevronRight,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Volume2,
  Music,
  Users,
  Users2,
  Camera,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { useLocation } from './hooks/useLocation';
import { useVoiceActivation } from './hooks/useVoiceActivation';
import { useGeofencing } from './hooks/useGeofencing';
import { 
  createSOSAlert, 
  subscribeToActiveAlerts, 
  addSafeZone, 
  subscribeToSafeZones, 
  deleteSafeZone,
  updateUserProfile,
  updateLocation,
  getUserProfile
} from './lib/firebaseService';

// --- Constants & Utils ---

const PREDEFINED_SOUNDS = {
  alert: [
    { id: 'alarm', name: 'High Alert', url: 'https://www.soundjay.com/misc/sounds/alarm-clock-01.mp3' },
    { id: 'siren', name: 'Rescue Siren', url: 'https://www.soundjay.com/misc/sounds/siren-3.mp3' },
    { id: 'beep', name: 'Rapid Beep', url: 'https://www.soundjay.com/buttons/sounds/beep-07.mp3' },
    { id: 'bell', name: 'Warning Bell', url: 'https://www.soundjay.com/misc/sounds/bell-ringing-05.mp3' },
  ],
  geofence: [
    { id: 'none', name: 'Silent', url: '' },
    { id: 'ding', name: 'Modern Ding', url: 'https://www.soundjay.com/buttons/sounds/button-09.mp3' },
    { id: 'chime', name: 'Soft Chime', url: 'https://www.soundjay.com/misc/sounds/small-bell-ring-01.mp3' },
    { id: 'bubble', name: 'Air Bubble', url: 'https://www.soundjay.com/misc/sounds/water-droplet-1.mp3' },
  ]
};

const playSound = (url: string) => {
  if (!url) return;
  const audio = new Audio();
  audio.src = url;
  audio.crossOrigin = "anonymous";
  
  const playPromise = audio.play();
  
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      // Browsers often block autoplay without user interaction
      // We log more context for debugging
      console.warn('Audio play failed (this is often expected if no recent user interaction):', error.message);
    });
  }
};

// --- Components ---

const SoundSelector = ({ label, currentId, options, onSelect }: { label: string, currentId: string, options: any[], onSelect: (id: string, url: string) => void }) => (
  <div className="p-4 bg-white border border-gray-100 rounded-2xl">
    <div className="flex items-center gap-2 mb-3">
      <Volume2 className="w-4 h-4 text-blue-500" />
      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
    </div>
    <div className="grid grid-cols-2 gap-2">
      {options.map(sound => (
        <button
          key={sound.id}
          onClick={() => onSelect(sound.id, sound.url)}
          className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
            currentId === sound.id 
              ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
              : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
          }`}
        >
          {sound.name}
        </button>
      ))}
    </div>
  </div>
);

const LiveSharingToggle = ({ isSharing, onToggle }: { isSharing: boolean, onToggle: (val: boolean) => void }) => (
  <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-xl ${isSharing ? 'bg-green-100' : 'bg-gray-100'}`}>
        <MapPin className={`w-5 h-5 ${isSharing ? 'text-green-600' : 'text-gray-400'}`} />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">Live Location Sharing</p>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          {isSharing ? 'Visible to trusted contacts' : 'Location private'}
        </p>
      </div>
    </div>
    <button 
      onClick={() => onToggle(!isSharing)}
      className={`w-12 h-6 rounded-full transition-colors relative ${isSharing ? 'bg-green-500' : 'bg-gray-200'}`}
    >
      <motion.div 
        animate={{ x: isSharing ? 24 : 4 }}
        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
      />
    </button>
  </div>
);

const SOSButton = ({ onTrigger }: { onTrigger: () => void }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isPressing) {
      interval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 100));
      }, 20);
    } else {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [isPressing]);

  useEffect(() => {
    if (progress >= 100 && isPressing) {
      setIsPressing(false);
      setProgress(0);
      onTrigger();
    }
  }, [progress, isPressing, onTrigger]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white border-b border-gray-100 shadow-sm rounded-3xl">
      <div className="relative group">
        <motion.div
          animate={isPressing ? { scale: 0.95 } : { scale: 1 }}
          className="relative z-10"
        >
          <button
            onMouseDown={() => setIsPressing(true)}
            onMouseUp={() => setIsPressing(false)}
            onMouseLeave={() => setIsPressing(false)}
            onTouchStart={() => setIsPressing(true)}
            onTouchEnd={() => setIsPressing(false)}
            className="flex items-center justify-center w-48 h-48 text-white transition-shadow duration-300 bg-red-600 rounded-full shadow-2xl active:shadow-inner"
          >
            <div className="flex flex-col items-center">
              <span className="text-4xl font-black tracking-tighter uppercase">SOS</span>
              <span className="text-xs font-semibold tracking-widest opacity-80">HOLD FOR 2S</span>
            </div>
          </button>
        </motion.div>

        {/* Progress ring */}
        <svg className="absolute top-0 left-0 w-48 h-48 -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="90"
            fill="transparent"
            stroke="rgba(220, 38, 38, 0.2)"
            strokeWidth="12"
          />
          <motion.circle
            cx="96"
            cy="96"
            r="90"
            fill="transparent"
            stroke="rgb(220, 38, 38)"
            strokeWidth="12"
            strokeDasharray="565.48"
            strokeDashoffset={565.48 - (565.48 * progress) / 100}
            strokeLinecap="round"
          />
        </svg>

        {/* Pulsing effect */}
        {!isPressing && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute top-0 left-0 w-48 h-48 bg-red-600 rounded-full -z-0"
          />
        )}
      </div>
    </div>
  );
};

const Header = ({ user, onLogout }: { user: any, onLogout: () => void }) => (
  <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
    <div className="flex items-center gap-2">
      <div className="p-2 bg-red-100 rounded-xl">
        <Shield className="w-6 h-6 text-red-600" />
      </div>
      <div>
        <h1 className="text-lg font-bold tracking-tight text-gray-900">Guardian Safety</h1>
        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Safe Passage System</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {user && (
        <button onClick={onLogout} className="p-2 text-gray-400 transition-colors hover:text-gray-600">
          <LogOut className="w-5 h-5" />
        </button>
      )}
      <div className="w-10 h-10 bg-gray-100 border border-gray-200 rounded-full overflow-hidden">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="User" referrerPolicy="no-referrer" />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-gray-400">
            <User className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  </header>
);

const SafeStats = ({ location }: { location: any }) => (
  <div className="grid grid-cols-2 gap-3 px-6 py-4">
    <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-blue-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Location</span>
      </div>
      <p className="text-sm font-semibold text-gray-700">
        {location ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}` : 'Detecting...'}
      </p>
    </div>
    <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-orange-500" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Nearby Help</span>
      </div>
      <p className="text-sm font-semibold text-gray-700">3 Stations Active</p>
    </div>
  </div>
);

// --- Main App ---

export default function App() {
  const { user, loading, login, logout } = useAuth();
  const { location, setManualLocation, manualLocation, error: locError } = useLocation();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [safeZones, setSafeZones] = useState<any[]>([]);
  const [isAlerting, setIsAlerting] = useState(false);
  const [isLiveSharing, setIsLiveSharing] = useState(false);
  const [view, setView] = useState<'dashboard' | 'map' | 'settings'>('dashboard');
  const [notification, setNotification] = useState<string | null>(null);
  const [zoom, setZoom] = useState(15);
  const [selectedMapItem, setSelectedMapItem] = useState<{ type: 'alert' | 'safezone', data: any } | null>(null);
  const [sosTargetGroup, setSosTargetGroup] = useState<string>('all');

  const alertSound = PREDEFINED_SOUNDS.alert.find(s => s.id === (userProfile?.alertSound || 'alarm'))?.url || PREDEFINED_SOUNDS.alert[0].url;
  const geofenceSound = PREDEFINED_SOUNDS.geofence.find(s => s.id === (userProfile?.geofenceSound || 'ding'))?.url || '';

  const handleSOS = useCallback(async () => {
    // Use a function-local check or ref if location is very unstable, 
    // but here we'll just keep it stable by passing it as a dependency 
    // or using a strategy to avoid resetting timers.
    if (!location) return;
    setIsAlerting(true);
    playSound(alertSound);
    await createSOSAlert({ location, targetGroup: sosTargetGroup });
    setTimeout(() => setIsAlerting(false), 5000);
  }, [location, alertSound, sosTargetGroup]);

  const onEnter = useCallback((zone: any) => {
    setNotification(`Entered Safe Zone: ${zone.name}`);
    playSound(geofenceSound);
    setTimeout(() => setNotification(null), 3000);
  }, [geofenceSound]);

  const onExit = useCallback((zone: any) => {
    setNotification(`Exited Safe Zone: ${zone.name}`);
    playSound(geofenceSound);
    setTimeout(() => setNotification(null), 3000);
  }, [geofenceSound]);

  const { currentZones } = useGeofencing(
    location,
    safeZones,
    onEnter,
    onExit
  );

  const { isListening, startListening } = useVoiceActivation(handleSOS);

  useEffect(() => {
    if (isLiveSharing && location && user) {
      updateLocation(user.uid, location);
    }
  }, [location, isLiveSharing, user]);

  useEffect(() => {
    if (user) {
      getUserProfile(user.uid).then(profile => {
        setUserProfile(profile);
        setIsLiveSharing(!!profile?.isLiveSharing);
      });

      const unsubAlerts = subscribeToActiveAlerts(setActiveAlerts);
      const unsubZones = subscribeToSafeZones(user.uid, setSafeZones);
      return () => {
        unsubAlerts();
        unsubZones();
      };
    }
  }, [user]);

  const handleAddSafeZone = async () => {
    if (!location || !user) return;
    const name = prompt('Enter Safe Zone Name:', 'Home');
    if (!name) return;
    await addSafeZone(user.uid, {
      name,
      center: location,
      radius: 100, // Default 100m
      notifyMe: true,
      notifyContacts: true
    });
  };

  const handleDeleteZone = async (id: string) => {
    if (!user) return;
    if (confirm('Delete this safe zone?')) {
      await deleteSafeZone(user.uid, id);
    }
  };

  const handleAddContact = async () => {
    if (!user || !userProfile) return;
    const name = prompt('Contact Name:');
    if (!name) return;
    const phone = prompt('Contact Phone:');
    if (!phone) return;
    const groupInput = prompt('Group (Family, Friends, Other):', 'Other');
    const group = ['Family', 'Friends', 'Other'].includes(groupInput || '') ? groupInput : 'Other';

    const newContacts = [...(userProfile.emergencyContacts || []), { name, phone, group }];
    setUserProfile((prev: any) => ({ ...prev, emergencyContacts: newContacts }));
    await updateUserProfile(user.uid, { emergencyContacts: newContacts });
  };

  const handleDeleteContact = async (index: number) => {
    if (!user || !userProfile) return;
    if (confirm('Delete this contact?')) {
      const newContacts = (userProfile.emergencyContacts || []).filter((_: any, i: number) => i !== index);
      setUserProfile((prev: any) => ({ ...prev, emergencyContacts: newContacts }));
      await updateUserProfile(user.uid, { emergencyContacts: newContacts });
    }
  };

  const handleUpdateSound = async (type: 'alert' | 'geofence', id: string, url: string) => {
    if (!user) return;
    const update = type === 'alert' ? { alertSound: id } : { geofenceSound: id };
    setUserProfile((prev: any) => ({ ...prev, ...update }));
    playSound(url);
    await updateUserProfile(user.uid, update);
  };

  const handleUpdateProfile = async (updates: any) => {
    if (!user) return;
    setUserProfile((prev: any) => ({ ...prev, ...updates }));
    await updateUserProfile(user.uid, updates);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 150000) { // Limit to ~150KB for base64 storage
      alert('File too large. Please select an image under 150KB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      handleUpdateProfile({ photoURL: base64String });
    };
    reader.readAsDataURL(file);
  };

  const handleToggleSharing = async (val: boolean) => {
    if (!user) return;
    setIsLiveSharing(val);
    await updateUserProfile(user.uid, { isLiveSharing: val });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFDFD]">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center"
        >
          <Shield className="w-8 h-8 text-white" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FDFDFD] px-8">
        <motion.div
           initial={{ y: 20, opacity: 0 }}
           animate={{ y: 0, opacity: 1 }}
           className="text-center"
        >
          <div className="inline-flex p-5 mb-8 bg-red-50 rounded-3xl">
            <Shield className="w-12 h-12 text-red-600" />
          </div>
          <h1 className="mb-4 text-4xl font-black tracking-tight text-gray-900">Guardian</h1>
          <p className="mb-12 text-lg text-gray-500 leading-relaxed font-medium">Your personal safety companion. Secure, real-time, and always watching your back.</p>
          <button
            onClick={login}
            className="flex items-center justify-center w-full gap-3 px-8 py-5 text-lg font-bold text-white transition-all transform bg-gray-900 rounded-2xl hover:bg-gray-800 hover:scale-[1.02] active:scale-[0.98]"
          >
            <User className="w-6 h-6" />
            Continue with Secure Auth 
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F9FAFB] max-w-lg mx-auto relative shadow-2xl border-x border-gray-100">
      <Header user={user} onLogout={logout} />
      
      <main className="flex-1 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <LiveSharingToggle isSharing={isLiveSharing} onToggle={handleToggleSharing} />
              
              <div className="px-6 py-4 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">SOS Target Group</span>
                  <Users2 className="w-3 h-3 text-gray-400" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['all', 'Family', 'Friends', 'Other'].map(group => (
                    <button
                      key={group}
                      onClick={() => setSosTargetGroup(group)}
                      className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                        sosTargetGroup === group 
                          ? 'bg-red-600 border-red-600 text-white shadow-md' 
                          : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {group.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <SOSButton onTrigger={handleSOS} />
              <SafeStats location={location} />
              
              <div className="px-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Security Mode</h2>
                  <div 
                    onClick={() => startListening()}
                    className={`flex items-center gap-2 px-3 py-1 rounded-full cursor-pointer transition-colors ${isListening ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {isListening ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">{isListening ? 'Voice Monitoring Active' : 'Start Voice Trigger'}</span>
                  </div>
                </div>

                <div className="p-5 bg-gray-900 shadow-xl rounded-3xl text-white">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-xl">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                      </div>
                      <span className="font-bold tracking-tight">Active Alerts Nearby</span>
                    </div>
                    <span className="px-2 py-1 text-[10px] font-bold bg-red-400/20 text-red-400 rounded-lg uppercase tracking-widest">Live Now</span>
                  </div>
                  
                  <div className="space-y-3">
                    {activeAlerts.length > 0 ? (
                      activeAlerts.map(alert => (
                        <div key={alert.id} className="flex items-center justify-between p-3 border border-white/10 rounded-2xl bg-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <div>
                              <p className="text-sm font-medium">{alert.userName}</p>
                              {alert.targetGroup && alert.targetGroup !== 'all' && (
                                <span className="text-[8px] font-black uppercase text-red-500 tracking-tighter">Target: {alert.targetGroup}</span>
                              )}
                            </div>
                          </div>
                          <button className="p-2 bg-white/10 rounded-lg transition-colors hover:bg-white/20">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-sm text-gray-400 font-medium">All clear. No alerts in your area.</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'map' && (
            <motion.div
              key="map"
              className="flex-1 h-full min-h-[500px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="h-full rounded-3xl overflow-hidden m-6 border border-gray-100 shadow-xl relative">
                <Map 
                  height={600}
                  defaultCenter={location ? [location.latitude, location.longitude] : [0, 0]} 
                  zoom={zoom}
                  onBoundsChanged={({ zoom: newZoom }) => setZoom(newZoom)}
                  onClick={({ latLng }) => {
                    setManualLocation({ latitude: latLng[0], longitude: latLng[1] });
                    setSelectedMapItem(null);
                  }}
                >
                  {location && (
                    <Marker width={50} anchor={[location.latitude, location.longitude]} color="red" />
                  )}
                  {activeAlerts.map(alert => {
                    const M: any = Marker;
                    return (
                      <M 
                        key={alert.id} 
                        width={40} 
                        anchor={[alert.location.latitude, alert.location.longitude]} 
                        color="#ef4444" 
                        onClick={() => setSelectedMapItem({ type: 'alert', data: alert })}
                      />
                    );
                  })}
                  {safeZones.map(zone => {
                    const M: any = Marker;
                    const isInside = currentZones.includes(zone.id);
                    return (
                      <M 
                        key={zone.id} 
                        width={30} 
                        anchor={[zone.center.latitude, zone.center.longitude]} 
                        color={isInside ? "#10b981" : "#3b82f6"} 
                        onClick={() => setSelectedMapItem({ type: 'safezone', data: zone })}
                      />
                    );
                  })}
                </Map>

                {/* Selection Details Overlay */}
                <AnimatePresence>
                  {selectedMapItem && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-4 left-4 right-4 z-20"
                    >
                      <div className="bg-white/95 backdrop-blur-md p-5 rounded-3xl shadow-2xl border border-gray-100">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-0.5 rounded-2xl overflow-hidden border-2 ${selectedMapItem.type === 'alert' ? 'border-red-100' : 'border-blue-100'}`}>
                              {selectedMapItem.type === 'alert' && selectedMapItem.data.photoURL ? (
                                <img 
                                  src={selectedMapItem.data.photoURL} 
                                  alt="" 
                                  className="w-12 h-12 object-cover rounded-xl"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className={`p-3 rounded-xl ${selectedMapItem.type === 'alert' ? 'bg-red-100/50' : 'bg-blue-100/50'}`}>
                                  {selectedMapItem.type === 'alert' ? (
                                    <AlertCircle className="w-6 h-6 text-red-600" />
                                  ) : (
                                    <Shield className="w-6 h-6 text-blue-600" />
                                  )}
                                </div>
                              )}
                            </div>
                            <div>
                              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                                {selectedMapItem.type === 'alert' ? selectedMapItem.data.userName : selectedMapItem.data.name}
                              </h3>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                {selectedMapItem.type === 'alert' ? 'Emergency Request' : 'Designated Safe Zone'}
                              </p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setSelectedMapItem(null)}
                            className="p-1 px-2 text-xs font-bold text-gray-400 hover:text-gray-600"
                          >
                            CLOSE
                          </button>
                        </div>

                        <div className="space-y-3">
                          {selectedMapItem.type === 'alert' ? (
                            <>
                              {selectedMapItem.data.bio && (
                                <div className="py-2 px-3 bg-gray-50 rounded-xl mb-2">
                                  <p className="text-xs text-gray-600 leading-relaxed italic">"{selectedMapItem.data.bio}"</p>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                                <span className="text-gray-400">Status</span>
                                <span className="font-bold text-red-600 uppercase">Active Now</span>
                              </div>
                              <div className="flex items-center justify-between text-sm py-2">
                                <span className="text-gray-400">Location</span>
                                <span className="font-bold text-gray-700">
                                  {selectedMapItem.data.location.latitude.toFixed(4)}, {selectedMapItem.data.location.longitude.toFixed(4)}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between text-sm py-2 border-b border-gray-50">
                                <span className="text-gray-400">Protection Radius</span>
                                <span className="font-bold text-gray-700">{selectedMapItem.data.radius}m</span>
                              </div>
                              <div className="flex items-center justify-between text-sm py-2">
                                <span className="text-gray-400">Status</span>
                                <span className={`font-bold uppercase ${currentZones.includes(selectedMapItem.data.id) ? 'text-green-600' : 'text-gray-400'}`}>
                                  {currentZones.includes(selectedMapItem.data.id) ? 'Currently Inside' : 'Not in range'}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        
                        <button 
                          onClick={() => {
                            if (selectedMapItem.type === 'alert') {
                              setZoom(18);
                              setManualLocation({ 
                                latitude: selectedMapItem.data.location.latitude, 
                                longitude: selectedMapItem.data.location.longitude 
                              });
                            } else {
                              setView('settings');
                            }
                            setSelectedMapItem(null);
                          }}
                          className="w-full mt-5 py-3 bg-gray-900 text-white font-bold rounded-2xl active:scale-95 transition-transform"
                        >
                          {selectedMapItem.type === 'alert' ? 'Focus on Emergency' : 'Update Zone Settings'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
                  <button 
                    onClick={handleAddSafeZone}
                    className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur shadow-lg border border-gray-100 rounded-xl text-sm font-bold text-gray-900 active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Add Safe Zone
                  </button>
                  
                  <div className="flex flex-col bg-white/90 backdrop-blur shadow-lg border border-gray-100 rounded-xl overflow-hidden self-end">
                    <button 
                      onClick={() => setZoom(z => Math.min(z + 1, 20))}
                      className="p-3 text-gray-700 hover:bg-gray-100 border-b border-gray-100 transition-colors"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setZoom(z => Math.max(z - 1, 1))}
                      className="p-3 text-gray-700 hover:bg-gray-100 transition-colors"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                  </div>

                  {manualLocation && (
                    <button 
                      onClick={() => setManualLocation(null)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white shadow-lg rounded-xl text-xs font-bold active:scale-95 transition-transform self-end"
                    >
                      <MapPin className="w-3 h-3" /> Reset to GPS
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div
              key="settings"
              className="px-6 py-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className="text-xl font-bold mb-6 text-gray-900 tracking-tight">Safety Settings</h2>
              
              <div className="space-y-6">
                {/* Profile Section */}
                <section>
                  <h2 className="text-xl font-bold mb-6 text-gray-900 tracking-tight">Your Profile</h2>
                  <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex flex-col items-center gap-4">
                      <div className="relative">
                        <div className="w-24 h-24 rounded-full bg-gray-50 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                          {userProfile?.photoURL ? (
                            <img 
                              src={userProfile.photoURL} 
                              alt="Profile" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <UserIcon className="w-10 h-10 text-gray-300" />
                          )}
                        </div>
                        <label className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white shadow-xl cursor-pointer hover:bg-blue-700 transition-colors">
                          <Camera className="w-4 h-4" />
                          <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleImageUpload}
                          />
                        </label>
                      </div>
                      
                      <div className="w-full space-y-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Display Name</label>
                          <input 
                            type="text"
                            value={userProfile?.displayName || ''}
                            onChange={(e) => handleUpdateProfile({ displayName: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100"
                            placeholder="Your name"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1 block">Bio</label>
                          <textarea 
                            value={userProfile?.bio || ''}
                            onChange={(e) => handleUpdateProfile({ bio: e.target.value })}
                            className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 resize-none"
                            placeholder="Tell trusted contacts a bit about yourself..."
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Notification Sounds Section */}
                <section>
                  <h2 className="text-xl font-bold mb-6 text-gray-900 tracking-tight">Notification Sounds</h2>
                  <div className="space-y-4">
                    <SoundSelector 
                      label="SOS Alert Sound" 
                      currentId={userProfile?.alertSound || 'alarm'} 
                      options={PREDEFINED_SOUNDS.alert}
                      onSelect={(id, url) => handleUpdateSound('alert', id, url)}
                    />
                    <SoundSelector 
                      label="Geofence Entry/Exit" 
                      currentId={userProfile?.geofenceSound || 'ding'} 
                      options={PREDEFINED_SOUNDS.geofence}
                      onSelect={(id, url) => handleUpdateSound('geofence', id, url)}
                    />
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Your Safe Zones</h3>
                    <button 
                      onClick={handleAddSafeZone}
                      className="p-2 bg-gray-100 rounded-xl text-gray-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {safeZones.length > 0 ? (
                      safeZones.map(zone => (
                        <div key={zone.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${currentZones.includes(zone.id) ? 'bg-green-50' : 'bg-blue-50'}`}>
                              <Shield className={`w-4 h-4 ${currentZones.includes(zone.id) ? 'text-green-600' : 'text-blue-600'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900">{zone.name}</p>
                              <p className="text-xs text-gray-400">{zone.radius}m Radius</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleDeleteZone(zone.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">No safe zones defined. Add one from the map.</p>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Emergency Contacts</h3>
                    <button 
                      onClick={handleAddContact}
                      className="p-2 bg-gray-100 rounded-xl text-gray-600"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-6">
                    {['Family', 'Friends', 'Other'].map(groupName => {
                      const groupContacts = (userProfile?.emergencyContacts || []).filter((c: any) => c.group === groupName);
                      if (groupContacts.length === 0 && userProfile?.emergencyContacts?.some((c: any) => !c.group && groupName === 'Other')) {
                        // Handle legacy contacts without group
                        groupContacts.push(...(userProfile.emergencyContacts.filter((c: any) => !c.group)));
                      }
                      
                      if (groupContacts.length === 0) return null;

                      return (
                        <div key={groupName} className="space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-3 h-3 text-blue-500" />
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{groupName}</h4>
                          </div>
                          {groupContacts.map((contact: any, index: number) => {
                            const originalIndex = userProfile.emergencyContacts.findIndex((c: any) => c === contact);
                            return (
                              <div key={index} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-50 rounded-xl">
                                    <Phone className="w-4 h-4 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-gray-900">{contact.name}</p>
                                    <p className="text-xs text-gray-400 font-medium">{contact.phone}</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDeleteContact(originalIndex)}
                                  className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    {!userProfile?.emergencyContacts?.length && (
                      <p className="text-xs text-gray-400 italic bg-white p-4 rounded-2xl border border-dashed border-gray-200">No emergency contacts added yet.</p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-4">Integrations</h3>
                  <div className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-xl">
                        <Shield className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Local Police Sync</p>
                        <p className="text-xs text-gray-400">Automatically notify nearest station</p>
                      </div>
                    </div>
                    <div className="w-12 h-6 bg-gray-100 rounded-full p-1 cursor-pointer">
                       <div className="w-4 h-4 bg-gray-400 rounded-full" />
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto px-6 py-4 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-40">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setView('dashboard')}
            className={`flex flex-col items-center gap-1 transition-colors ${view === 'dashboard' ? 'text-red-600' : 'text-gray-400'}`}
          >
            <Shield className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Home</span>
          </button>
          <button 
            onClick={() => setView('map')}
            className={`flex flex-col items-center gap-1 transition-colors ${view === 'map' ? 'text-red-600' : 'text-gray-400'}`}
          >
            <MapPin className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Map</span>
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`flex flex-col items-center gap-1 transition-colors ${view === 'settings' ? 'text-red-600' : 'text-gray-400'}`}
          >
            <Settings className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Setup</span>
          </button>
        </div>
      </nav>

      {/* Geofencing Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-28 left-6 right-6 z-50 p-4 bg-gray-900 text-white rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="p-2 bg-white/20 rounded-xl">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-sm font-bold">{notification}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SOS Active Overlay */}
      <AnimatePresence>
        {isAlerting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-600 text-white"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            >
              <AlertCircle className="w-32 h-32 mb-8" />
            </motion.div>
            <h2 className="text-4xl font-black uppercase mb-4 tracking-tighter">Alert Active</h2>
            <p className="text-xl font-medium opacity-80 mb-8">Emergency contacts have been notified</p>
            <button 
              onClick={() => setIsAlerting(false)}
              className="px-8 py-4 bg-white text-red-600 font-bold rounded-2xl shadow-xl active:scale-95"
            >
              CANCEL ALERT
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
