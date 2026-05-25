import React, { useState, useEffect } from 'react';
import { Resource } from '../types';
import { CATEGORY_COLORS } from './ResourceMap';
import { X, Phone, Mail, Clock, ShieldAlert, Sparkles, AlertCircle, Heart, Navigation, FileText, Check, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';

interface ResourceDetailsProps {
  resource: Resource | null;
  onClose: () => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSaveNotes: (id: string, notes: string) => void;
  onDeleteCustomResource?: (id: string) => void;
  isAdmin?: boolean;
  onStartEdit?: (resource: Resource) => void;
  onDeleteResource?: (id: string) => void;
}

export default function ResourceDetails({
  resource,
  onClose,
  favorites,
  onToggleFavorite,
  onSaveNotes,
  onDeleteCustomResource,
  isAdmin,
  onStartEdit,
  onDeleteResource
}: ResourceDetailsProps) {
  const [localNotes, setLocalNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [routingStep, setRoutingStep] = useState(0);

  // Sync notes when resource changes
  useEffect(() => {
    if (resource) {
      setLocalNotes(resource.notes || '');
      setIsSaved(false);
      setIsRouting(false);
      setRoutingStep(0);
    }
  }, [resource]);

  if (!resource) return null;

  const isFav = favorites.includes(resource.id);
  const config = CATEGORY_COLORS[resource.category] || CATEGORY_COLORS.personal;

  const handleNotesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNotes(resource.id, localNotes);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Simulate routing path
  const handleStartRouting = () => {
    setIsRouting(true);
    setRoutingStep(1);
    
    setTimeout(() => {
      setRoutingStep(2);
    }, 1500);

    setTimeout(() => {
      setRoutingStep(3);
    }, 3200);
  };

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[460px] bg-white border-l border-slate-150 z-30 shadow-2xl flex flex-col pointer-events-auto h-full">
      {/* Header Banner */}
      <div className="relative p-6 border-b border-slate-100 shrink-0 text-white select-none overflow-hidden" style={{ backgroundColor: config.bg }}>
        {/* Abstract background vector aura */}
        <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-white/10 blur-xl"></div>
        <div className="absolute -left-6 -top-6 w-24 h-24 rounded-full bg-black/10 blur-md"></div>

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl bg-white/15 p-2 rounded-xl backdrop-blur-md">{config.icon}</span>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/85 block">
                {resource.subcategory}
              </span>
              <h2 className="text-base font-bold font-display mt-0.5 leading-snug">{resource.name}</h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition cursor-pointer"
            title="Cerrar Detalles"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Floating Sector Badges */}
        <div className="relative flex items-center gap-2 mt-4 text-[10px] font-bold">
          <span className="bg-white/15 px-2.5 py-1 rounded-md border border-white/10 backdrop-blur-xs">
            {resource.isPublic ? 'Administración Pública/Estatal' : 'ONG / Red Territorial'}
          </span>
          {resource.isGuardia24h && (
            <span className="bg-amber-400 text-amber-950 px-2.5 py-1 rounded-md font-extrabold shadow-sm">
              Guardia 24 Horas Activa
            </span>
          )}
        </div>
      </div>

      {/* Details Scrollbody */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        
        {/* Core Description block */}
        <div className="bg-slate-50/70 p-5 rounded-2xl border-2 border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Información del Recurso</h3>
          <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
            {resource.description}
          </p>
        </div>

        {/* Contact details list */}
        <div className="flex flex-col gap-3.5">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contacto y Ubicación</h3>
          
          <div className="grid grid-cols-1 gap-3 text-xs text-slate-600">
            {/* Address */}
            <div className="flex items-start gap-3.5 p-4 bg-white border-2 border-slate-100 rounded-2xl">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Navigation className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-slate-800">Dirección Física</p>
                <p className="mt-0.5 text-slate-600 font-medium">{resource.address}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">CC: {resource.lat.toFixed(4)}, {resource.lng.toFixed(4)}</p>
              </div>
            </div>

            {/* Direct Phone */}
            {resource.phone && (
              <a
                href={`tel:${resource.phone}`}
                className="flex items-start gap-3.5 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/10 transition duration-200 group"
              >
                <div className="p-2 rounded-xl bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  <Phone className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-800">Teléfono directo</p>
                  <p className="mt-0.5 text-indigo-600 font-black group-hover:underline">{resource.phone}</p>
                </div>
              </a>
            )}

            {/* Email link */}
            {resource.email && (
              <a
                href={`mailto:${resource.email}`}
                className="flex items-start gap-3.5 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/10 transition duration-200 group"
              >
                <div className="p-2 rounded-xl bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600">
                  <Mail className="w-4.5 h-4.5 text-slate-500 group-hover:text-indigo-600">
                    <Mail className="w-4.5 h-4.5" />
                  </Mail>
                </div>
                <div>
                  <p className="font-extrabold text-slate-800">Correo de Contacto</p>
                  <p className="mt-0.5 text-indigo-600 font-black group-hover:underline break-all">{resource.email}</p>
                </div>
              </a>
            )}

            {/* Working times */}
            {resource.hours && (
              <div className="flex items-start gap-3.5 p-4 bg-white border-2 border-slate-100 rounded-2xl">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-500">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-800">Horarios de atención</p>
                  <p className="mt-0.5 text-slate-600 font-medium">{resource.hours}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action controls button stack */}
        <div className="grid grid-cols-2 gap-3.5 shrink-0">
          <button
            onClick={() => onToggleFavorite(resource.id)}
            className={`w-full py-3.5 px-4.5 rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer ${
              isFav
                ? 'bg-rose-50 border-rose-300 text-rose-700 shadow-xs'
                : 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-350'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-600 text-rose-600' : ''}`} />
            <span>{isFav ? 'Quitar Marcador' : 'Guardar Favorito'}</span>
          </button>

          {!isRouting ? (
            <button
              onClick={handleStartRouting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 px-4.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition hover:scale-[1.01] hover:shadow-lg hover:shadow-indigo-100 active:scale-95 cursor-pointer"
            >
              <Navigation className="w-4 h-4" />
              <span>Cómo llegar</span>
            </button>
          ) : (
            <div className="w-full bg-indigo-50 border border-indigo-200 text-indigo-800 p-3 rounded-2xl flex items-center gap-2 animate-pulse justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block"></span>
              <span className="text-[10px] font-black">Ubicando ruta óptima...</span>
            </div>
          )}
        </div>

        {/* Routing progress layout */}
        {isRouting && (
          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 text-xs text-indigo-900 animate-fade-in-down">
            <h4 className="font-bold flex items-center gap-1.5 mb-2.5">
              <Navigation className="w-4 h-4 text-indigo-600 animate-pulse" />
              <span>Ruta sugerida desde Plaza Moreno</span>
            </h4>
            
            <div className="flex flex-col gap-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-indigo-200">
              <div className="flex items-center gap-3 relative z-10">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${routingStep >= 1 ? 'bg-indigo-600' : 'bg-slate-300'}`}>1</div>
                <div>
                  <p className="font-semibold text-slate-800">Partida: Plaza Moreno (La Plata)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Dirígete hacia Diagonal 73 / Calle 12.</p>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white transition ${routingStep >= 2 ? 'bg-indigo-600' : 'bg-slate-300'}`}>2</div>
                <div>
                  <p className="font-semibold text-slate-800">Tránsito sugerido</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{routingStep >= 2 ? 'Tomar calle con menor congestión hacia ' + resource.address.split(',')[0] : 'Calculando calles óptimas...'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white transition ${routingStep >= 3 ? 'bg-indigo-600' : 'bg-slate-300'}`}>3</div>
                <div>
                  <p className="font-semibold text-slate-800">Llegada al destino</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Destino a la derecha: <span className="font-bold text-indigo-700">{resource.name}</span>.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Private Localized Notes text form */}
        <form onSubmit={handleNotesSubmit} className="border-t border-slate-100 pt-5 mt-auto flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-500" />
              <span>Mis Anotaciones Personales</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">Sólo tú puedes verlas</span>
          </div>

          <p className="text-[10px] text-slate-400 leading-snug">
            Guarda coordenadas extra, nombres de referentes locales, números telefónicos internos o bitácoras del caso. Estas notas se persisten localmente en tu navegador.
          </p>

          <textarea
            className="w-full min-h-[90px] p-3 text-xs bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded-xl transition placeholder:text-slate-400 focus:shadow-xs resize-y"
            placeholder="Escribe anotaciones de utilidad para este recurso..."
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
          />

          <div className="flex items-center justify-between gap-3 mt-1 shrink-0">
            {isSaved ? (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4 text-emerald-600 animate-bounce" />
                <span>¡Notas guardadas con éxito!</span>
              </span>
            ) : (
              <div />
            )}

            <button
              type="submit"
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition hover:shadow-xs active:scale-95 cursor-pointer ml-auto shrink-0"
            >
              Guardar Nota
            </button>
          </div>
        </form>

        {/* Admin controls panel inside resource details */}
        {isAdmin && (
          <div className="mt-4 pt-4 border-t-2 border-indigo-100/50 bg-indigo-50/20 p-4.5 rounded-2xl flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block animate-pulse shrink-0"></span>
              <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest leading-none">
                Panel de Control Administrador
              </p>
            </div>
            <p className="text-[10px] text-indigo-500 font-medium leading-snug">
              Puedes actualizar o eliminar permanentemente la información de este recurso de la red para todos los operadores de RED LA PLATA.
            </p>
            <div className="grid grid-cols-2 gap-2.5 mt-1.5">
              <button
                type="button"
                onClick={() => onStartEdit && onStartEdit(resource)}
                className="flex items-center justify-center gap-1.5 text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50 text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer active:scale-95 shadow-2xs"
              >
                <span>Editar Datos</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`¿Estás seguro de que deseas eliminar permanentemente el recurso "${resource.name}"? Esta acción es irreversible.`)) {
                    if (onDeleteResource) {
                      onDeleteResource(resource.id);
                    } else if (onDeleteCustomResource) {
                      onDeleteCustomResource(resource.id);
                    }
                  }
                }}
                className="flex items-center justify-center gap-1.5 text-rose-600 hover:text-rose-700 bg-white border border-rose-200 hover:border-rose-300 hover:bg-rose-50 text-xs font-bold py-2.5 px-3 rounded-xl transition cursor-pointer active:scale-95 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        )}



      </div>
    </div>
  );
}
