export default function FormInput({ label, value, onChange, placeholder, type = "text" }) {
    return (
        <div className="space-y-3">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">{label}</label>
            <input
                type={type}
                className="p-4 bg-black/20 border border-white/10 rounded-xl w-full text-white focus:outline-none focus:border-orange-500/50 transition-all font-medium placeholder-gray-600"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
            />
        </div>
    );
}
