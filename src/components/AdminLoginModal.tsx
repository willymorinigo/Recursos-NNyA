import React, { useState } from 'react';
import { X, Shield, Lock, Eye, EyeOff, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface AdminLoginModalProps {
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function AdminLoginModal({ onClose, onLoginSuccess }: AdminLoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Standard local authentication bypass
    // Email: admin@redlaplata.org, password: admin
    if (email.trim().toLowerCase() === 'admin@redlaplata.org' && password === 'admin') {
      onLoginSuccess();
    } else {
      setError('Credenciales incorrectas. Verifique correo o clave de acceso.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[1100] flex items-center justify-center p-4 overflow-y-auto animate-fade-in pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 relative flex flex-col"
      >
        {/* Header Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-lg border border-slate-100 hover:bg-slate-50 text-slate-400 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand visual header */}
        <div className="flex flex-col items-center text-center pb-2 pt-2">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3.5 shadow-sm">
            <Shield className="w-6 h-6 stroke-[2]" />
          </div>
          <h2 className="text-lg font-black font-display text-slate-800 leading-tight">
            Acceso de Operador Autorizado
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-snug">
            Ingresa a la mesa administrativa para actualizar la red de recursos.
          </p>
        </div>

        {/* Credentials hints block */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-2.5 my-4 text-left">
          <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
          <div className="text-[10px] text-slate-500 font-medium">
            <p className="font-extrabold text-slate-700 uppercase tracking-widest text-[9px] mb-0.5">Credenciales del Sistema</p>
            <p>Usuario: <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">admin@redlaplata.org</code></p>
            <p className="mt-0.5">Contraseña: <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">admin</code></p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 text-left">
          {/* Email input */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
              Correo Institucional
            </label>
            <input
              type="email"
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-150 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl transition font-medium"
              placeholder="operador@redlaplata.org"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              required
            />
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">
              Clave de Firma
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full text-xs p-2.5 pr-10 bg-slate-50 border border-slate-150 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-xl transition font-medium"
                placeholder="Introducir clave..."
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer bg-transparent border-none p-0"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 p-2.5 rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 rounded-xl transition active:scale-[0.98] cursor-pointer shadow-md shadow-indigo-100 text-center"
          >
            Validar Operador
          </button>
        </form>
      </motion.div>
    </div>
  );
}
