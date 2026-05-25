import React, { useState } from 'react';
import { Resource, ResourceCategory } from '../types';
import { CATEGORY_COLORS } from './ResourceMap';
import { X, Sparkles, MapPin, Check, Plus } from 'lucide-react';
import { motion } from 'motion/react';

interface AddCustomMarkerModalProps {
  coords: { lat: number; lng: number } | null;
  onClose: () => void;
  onSave: (resource: Omit<Resource, 'id'> & { id?: string }) => void;
  resourceToEdit?: Resource | null;
}

export default function AddCustomMarkerModal({
  coords,
  onClose,
  onSave,
  resourceToEdit = null
}: AddCustomMarkerModalProps) {
  const [name, setName] = useState(resourceToEdit ? resourceToEdit.name : '');
  const [subcategory, setSubcategory] = useState(resourceToEdit ? resourceToEdit.subcategory : '');
  const [category, setCategory] = useState<ResourceCategory>(resourceToEdit ? resourceToEdit.category : 'educacion');
  const [address, setAddress] = useState(resourceToEdit ? resourceToEdit.address : '');
  const [description, setDescription] = useState(resourceToEdit ? resourceToEdit.description : '');
  const [targetAge, setTargetAge] = useState(resourceToEdit ? resourceToEdit.targetAge || 'Todo público' : 'Todo público');
  const [isPublic, setIsPublic] = useState(resourceToEdit ? resourceToEdit.isPublic : true);
  const [isGuardia24h, setIsGuardia24h] = useState(resourceToEdit ? !!resourceToEdit.isGuardia24h : false);
  const [phone, setPhone] = useState(resourceToEdit ? resourceToEdit.phone || '' : '');
  const [email, setEmail] = useState(resourceToEdit ? resourceToEdit.email || '' : '');

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!coords && !resourceToEdit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'El nombre es obligatorio.';
    if (!subcategory.trim()) newErrors.subcategory = 'La subcategoría es obligatoria (ej: Taller Comunitario).';
    if (!address.trim()) newErrors.address = 'La dirección física es obligatoria.';
    if (!description.trim()) newErrors.description = 'La descripción es obligatoria.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      ...(resourceToEdit ? { id: resourceToEdit.id } : {}),
      name,
      subcategory,
      category,
      address,
      lat: resourceToEdit ? resourceToEdit.lat : (coords?.lat || 0),
      lng: resourceToEdit ? resourceToEdit.lng : (coords?.lng || 0),
      description,
      targetAge,
      isPublic,
      isGuardia24h,
      phone: phone.trim() ? phone.trim() : undefined,
      email: email.trim() ? email.trim() : undefined
    });
  };

  const categoryOptions: { label: string; value: ResourceCategory; icon: string }[] = [
    { label: 'Educación y Oficios', value: 'educacion', icon: '🎓' },
    { label: 'Salud y Consumos', value: 'salud', icon: '🩺' },
    { label: 'Contención Social', value: 'contencion', icon: '🛡' },
    { label: 'Comunidad y Apoyo', value: 'comunidad', icon: '🤝' },
    { label: 'Recreativo y Cultural', value: 'recreacion', icon: '⚽' },
    { label: 'Derechos y Legal', value: 'legal', icon: '⚖️' },
    { label: 'Marcador Personal', value: 'personal', icon: '⭐' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[1100] flex items-center justify-center p-4 overflow-y-auto animate-fade-in pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full flex flex-col p-6 overflow-hidden relative"
      >
        {/* Header decoration */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl bg-indigo-50 p-2 rounded-xl text-indigo-600">
              {resourceToEdit ? '✏️' : '⭐'}
            </span>
            <div>
              <h2 className="text-base font-black font-display text-slate-800">
                {resourceToEdit ? 'Editar Recurso de la Red' : 'Agregar Recurso Personalizado'}
              </h2>
              <p className="text-[11px] text-slate-400 font-bold font-mono">
                {resourceToEdit
                  ? `COORDENADAS: ${resourceToEdit.lat.toFixed(5)}, ${resourceToEdit.lng.toFixed(5)}`
                  : `UBICACIÓN: ${coords ? coords.lat.toFixed(5) : 0}, ${coords ? coords.lng.toFixed(5) : 0}`
                }
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-slate-150 hover:bg-slate-50 text-slate-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-0.5 mt-5 flex flex-col gap-4 max-h-[70vh] text-left">
          
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nombre del Lugar / Recurso *</label>
              <input
                type="text"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded-xl transition"
                placeholder="Ej: Taller Comunitario Los Hornos"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
              />
              {errors.name && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Especialidad / Subcategoría *</label>
              <input
                type="text"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded-xl transition"
                placeholder="Ej: Taller de Costura y Apoyo"
                value={subcategory}
                onChange={(e) => {
                  setSubcategory(e.target.value);
                  if (errors.subcategory) setErrors({ ...errors, subcategory: '' });
                }}
              />
              {errors.subcategory && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.subcategory}</p>}
            </div>
          </div>

          {/* Category Picker Select */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Categoría de Filtro Principal</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {categoryOptions.map((opt) => {
                const isSelected = category === opt.value;
                const config = CATEGORY_COLORS[opt.value];
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCategory(opt.value)}
                    className={`p-2 rounded-xl text-[10px] font-bold border transition flex flex-col items-center gap-1 cursor-pointer text-center ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-300 text-indigo-950 scale-102 font-extrabold'
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <span className="text-base">{opt.icon}</span>
                    <span className="truncate max-w-[90%]">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Physical Address */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dirección Física *</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded-xl transition"
                placeholder="Ej: Calle 65 N° 456 e/ 12 y 13"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  if (errors.address) setErrors({ ...errors, address: '' });
                }}
              />
            </div>
            {errors.address && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.address}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Descripción y Redes de Articulación *</label>
            <textarea
              className="w-full min-h-[75px] text-xs p-3 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded-xl transition"
              placeholder="Detalla qué talleres, asesoramientos o servicios ofrece y cómo articular con el programa de no punibles..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors({ ...errors, description: '' });
              }}
            />
            {errors.description && <p className="text-[10px] text-red-500 font-bold mt-1">{errors.description}</p>}
          </div>

          {/* Quick Details Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Destinatarios / Edades Sugeridas</label>
              <input
                type="text"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded-xl transition"
                placeholder="Ej: 12 a 18 años, Todo público, etc."
                value={targetAge}
                onChange={(e) => setTargetAge(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2 justify-center select-none pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={() => setIsPublic(!isPublic)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-200"
                />
                <span className="font-semibold text-slate-700">Administrado por sector Estatal/Público</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={isGuardia24h}
                  onChange={() => setIsGuardia24h(!isGuardia24h)}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-200"
                />
                <span className="font-semibold text-slate-700">Ofrece Guardia Activa de Emergencia 24h</span>
              </label>
            </div>
          </div>

          {/* Extra Contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-50 pt-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Teléfono de Enlace (Opcional)</label>
              <input
                type="text"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded-xl transition"
                placeholder="Ej: 0221 444-5555"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">E-mail Operativo (Opcional)</label>
              <input
                type="text"
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 rounded-xl transition"
                placeholder="Ej: contacto@ejemplo.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Action buttons footer */}
          <div className="flex items-center justify-end gap-3.5 border-t border-slate-100 pt-5 mt-4 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer bg-transparent border-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md select-none active:scale-95 animate-fade-in"
            >
              {resourceToEdit ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Actualizar Recurso</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Guardar Recurso</span>
                </>
              )}
            </button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
