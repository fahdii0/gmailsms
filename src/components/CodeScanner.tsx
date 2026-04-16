"use client";

import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle, Clock, Mail, AlertCircle, XCircle, Copy } from 'lucide-react';

interface CodeScannerProps {
  purchaseId: string;
  onComplete?: (codes: string[]) => void;
  onCancel?: () => void;
}

const CodeScanner: React.FC<CodeScannerProps> = ({ purchaseId, onComplete, onCancel }) => {
  const [isScanning, setIsScanning] = useState(true);
  const [codes, setCodes] = useState<string[]>([]);
  const [latestCode, setLatestCode] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState(1500);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [purchaseStatus, setPurchaseStatus] = useState<'pending' | 'completed' | 'expired' | 'cancelled'>('pending');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const autoScanRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const fetchCode = async () => {
    if (!isScanning || purchaseStatus !== 'pending') return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/client/get-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        if (data.success && data.newCode) {
          setCodes(data.allCodes || [data.newCode]);
          setLatestCode(data.newCode);
          
          if (data.allCodes && data.allCodes.length > 0) {
            setCodes(data.allCodes);
          }
          
          if (data.remainingSeconds) {
            setTimeRemaining(data.remainingSeconds);
          }
        } else if (data.allCodes && data.allCodes.length > 0) {
          setCodes(data.allCodes);
          setLatestCode(data.latestCode || data.allCodes[data.allCodes.length - 1]);
        }
        
        setAttempts(data.attemptsUsed || 0);
        
        if (data.remainingSeconds) {
          setTimeRemaining(data.remainingSeconds);
        }
      } else {
        setError(data.error || 'Failed to fetch code');
        
        if (data.error?.includes('expired')) {
          setPurchaseStatus('expired');
          setIsScanning(false);
        } else if (data.error?.includes('cancelled')) {
          setPurchaseStatus('cancelled');
          setIsScanning(false);
        }
      }
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isScanning && purchaseStatus === 'pending') {
      fetchCode();
      
      autoScanRef.current = setInterval(() => {
        fetchCode();
      }, 3000);
    }
    
    return () => {
      if (autoScanRef.current) {
        clearInterval(autoScanRef.current);
      }
    };
  }, [isScanning, purchaseStatus]);

  useEffect(() => {
    if (isScanning && purchaseStatus === 'pending' && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setIsScanning(false);
            setPurchaseStatus('expired');
            setError('25-minute timeout reached. Purchase expired.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isScanning, purchaseStatus]);

  const stopScanning = () => {
    setIsScanning(false);
    if (autoScanRef.current) clearInterval(autoScanRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleComplete = () => {
    if (codes.length > 0) {
      stopScanning();
      onComplete?.(codes);
    }
  };

  const handleCancel = () => {
    stopScanning();
    onCancel?.();
  };

  return (
    <div className="w-full overflow-hidden bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-6 py-5">
        <div className="absolute inset-0 opacity-30 scan-grid" />
        <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl scan-orb" />
        <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-fuchsia-400/20 blur-2xl scan-orb" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail className="text-white" size={24} />
            <h2 className="text-white text-xl font-bold">SMS Code Scanner</h2>
          </div>
          
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none ${
              isScanning ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                isScanning ? 'translate-x-7' : 'translate-x-1'
              } ${isScanning ? 'animate-pulse' : ''}`}
            />
          </button>
        </div>
        
        <p className="relative mt-3 text-sm text-blue-100">
          {isScanning ? '🔍 Auto-scanning for SMS codes every 3 seconds...' : '⏸️ Scanning paused'}
        </p>
      </div>
      
      <div className="bg-gray-50 px-6 py-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock size={18} className="text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Time Remaining:</span>
          </div>
          <span className={`font-mono text-lg font-bold ${
            timeRemaining < 300 ? 'text-red-600 animate-pulse' : 'text-gray-800'
          }`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
        
        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-1000"
            style={{ width: `${(timeRemaining / 1500) * 100}%` }}
          />
        </div>
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isScanning && (
              <RefreshCw size={16} className="text-blue-500 animate-spin" />
            )}
            <span className="text-sm text-gray-600">
              {purchaseStatus === 'pending' && isScanning && 'Scanning for codes...'}
              {purchaseStatus === 'pending' && !isScanning && 'Scanning paused'}
              {purchaseStatus === 'completed' && '✅ Purchase completed'}
              {purchaseStatus === 'expired' && '⏰ Purchase expired'}
              {purchaseStatus === 'cancelled' && '❌ Purchase cancelled'}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Checks: {attempts}
          </span>
        </div>
      </div>
      
      <div className="p-6">
        {codes.length === 0 ? (
          <div className="text-center py-8">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 ring-1 ring-blue-100">
              <div className={`flex h-14 w-14 items-center justify-center rounded-full ${isScanning ? 'bg-blue-600 text-white scan-pulse' : 'bg-slate-200 text-slate-500'}`}>
                <Mail size={24} />
              </div>
            </div>
            <p className="text-gray-500 font-medium">Waiting for SMS code...</p>
            <p className="text-xs text-gray-400 mt-2">
              Codes will appear here automatically when received
            </p>
            {isLoading && (
              <div className="mt-5 space-y-2">
                <div className="mx-auto h-2 w-40 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-indigo-500 loading-bar" />
                </div>
                <p className="text-xs text-gray-400">Checking with SMSBower...</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 mb-3">
              Received Codes ({codes.length}):
            </h3>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {codes.map((code, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all border ${
                    index === codes.length - 1
                      ? 'bg-green-50 border-green-200 animate-pulse shadow-sm'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <CheckCircle 
                      size={20} 
                      className={index === codes.length - 1 ? 'text-green-500' : 'text-gray-400'} 
                    />
                    <div>
                      <p className="font-mono font-bold text-lg">{code}</p>
                      <p className="text-xs text-gray-500">
                        {index === codes.length - 1 ? 'Latest' : `Received ${index + 1}`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(code)}
                    className="flex items-center gap-1 text-xs bg-white px-3 py-1.5 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <Copy size={14} />
                    {copiedCode === code ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <div className="mt-6 space-y-2">
          {purchaseStatus === 'pending' && codes.length > 0 && (
            <button
              onClick={handleComplete}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-2.5 rounded-lg font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-sm"
            >
              ✓ Complete - Got the Code{codes.length > 1 ? 's' : ''}
            </button>
          )}
          
          {purchaseStatus === 'pending' && !isScanning && codes.length === 0 && (
            <button
              onClick={() => setIsScanning(true)}
              className="w-full bg-blue-500 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition-all"
            >
              ▶️ Resume Scanning
            </button>
          )}
          
          {purchaseStatus === 'pending' && (
            <button
              onClick={handleCancel}
              className="w-full bg-red-500 text-white py-2.5 rounded-lg font-semibold hover:bg-red-600 transition-all flex items-center justify-center gap-2"
            >
              <XCircle size={18} />
              Cancel Purchase
            </button>
          )}
        </div>
        
        <p className="text-xs text-gray-400 text-center mt-4">
          Auto-scans every 3 seconds for 25 minutes. Toggle scanning on/off anytime.
          {codes.length > 0 && ' All received codes are saved to your account.'}
        </p>
      </div>

      <style jsx>{`
        .scan-grid {
          background-image: linear-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.08) 1px, transparent 1px);
          background-size: 24px 24px;
        }

        .scan-orb {
          animation: floatOrb 6s ease-in-out infinite;
        }

        .scan-pulse {
          animation: scanPulse 1.8s ease-in-out infinite;
        }

        .loading-bar {
          animation: loadingBar 1.3s ease-in-out infinite;
        }

        @keyframes scanPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.45);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 0 0 14px rgba(59, 130, 246, 0);
          }
        }

        @keyframes loadingBar {
          0% {
            transform: translateX(-60%);
          }
          100% {
            transform: translateX(220%);
          }
        }

        @keyframes floatOrb {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(8px) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default CodeScanner;
