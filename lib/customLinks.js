import {
    MessageCircle,
    Instagram,
    Send,
    MapPin,
    Facebook,
    Youtube,
    Mail,
    Globe,
} from "lucide-react";

export const CUSTOM_LINK_TYPES = [
    {
        id: "whatsapp",
        label: "WhatsApp",
        icon: MessageCircle,
        placeholder: "https://wa.me/91XXXXXXXXXX",
    },
    {
        id: "instagram",
        label: "Instagram",
        icon: Instagram,
        placeholder: "https://instagram.com/your-handle",
    },
    { id: "telegram", label: "Telegram", icon: Send, placeholder: "https://t.me/your-handle" },
    {
        id: "google-maps",
        label: "Google Maps",
        icon: MapPin,
        placeholder: "https://maps.app.goo.gl/...",
    },
    {
        id: "facebook",
        label: "Facebook",
        icon: Facebook,
        placeholder: "https://facebook.com/your-page",
    },
    {
        id: "youtube",
        label: "YouTube",
        icon: Youtube,
        placeholder: "https://youtube.com/@your-channel",
    },
    { id: "email", label: "Email", icon: Mail, placeholder: "mailto:you@example.com" },
    { id: "website", label: "Website", icon: Globe, placeholder: "https://your-website.com" },
];

export const getCustomLinkType = (id) => CUSTOM_LINK_TYPES.find((t) => t.id === id) || null;
