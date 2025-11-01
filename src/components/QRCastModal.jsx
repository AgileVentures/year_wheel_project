import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { X } from 'lucide-react';

/**
 * QRCastModal - iOS casting fallback
 * Shows a QR code that links to the cast receiver with a session token
 * Used when Chrome Cast SDK is not available (iOS devices)
 */
function QRCastModal({ isOpen, onClose, sessionToken, wheelData }) {
  const canvasRef = useRef(null);
  const [qrError, setQrError] = useState(null);

  useEffect(() => {
    if (!isOpen || !canvasRef.current || !sessionToken) return;

    const generateQR = async () => {
      try {
        // Build receiver URL with session token
        const receiverUrl = `${window.location.origin}/cast-receiver?session=${sessionToken}`;
        
        // Generate QR code on canvas
        await QRCode.toCanvas(canvasRef.current, receiverUrl, {
          width: 280,
          margin: 2,
          color: {
            dark: '#1F2937',  // gray-800
            light: '#FFFFFF'
          }
        });
        
        setQrError(null);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
        setQrError('Kunde inte generera QR-kod');
      }
    };

    generateQR();
  }, [isOpen, sessionToken]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Stäng"
        >
          <X size={24} />
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Casta till skärm
        </h2>
        
        <p className="text-gray-600 text-sm mb-6">
          Skanna QR-koden med en annan enhet som har en större skärm
        </p>

        {/* QR Code */}
        <div className="flex justify-center mb-6 bg-gray-50 p-6 rounded-lg">
          {qrError ? (
            <div className="text-red-600 text-sm">{qrError}</div>
          ) : (
            <canvas ref={canvasRef} />
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
              1
            </div>
            <p>Öppna kameran på din iPad, laptop eller annan skärmenhet</p>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
              2
            </div>
            <p>Skanna QR-koden ovan</p>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 text-blue-700 font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs">
              3
            </div>
            <p>Hjulet visas i helskärm medan du styr från din telefon</p>
          </div>
        </div>

        {/* Wheel info */}
        {wheelData && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Castar: <span className="font-medium text-gray-700">{wheelData.title} ({wheelData.year})</span>
            </p>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-sm hover:bg-gray-200 transition-colors font-medium"
        >
          Stäng
        </button>
      </div>
    </div>
  );
}

export default QRCastModal;
