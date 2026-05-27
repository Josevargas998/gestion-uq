const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../src/components/DetalleSolicitud.jsx');
let content = fs.readFileSync(file, 'utf8');

// Agregar importaciones si no existen
if (!content.includes('import { CheckCircle')) {
  content = content.replace(
    "import { TIPOS } from '../data.js';",
    "import { TIPOS } from '../data.js';\nimport { CheckCircle, Clock, Check, FileText, Download, X, AlertTriangle, MessageSquare, ChevronDown, ChevronUp, Trash2, Edit3, User, Search, MapPin, Landmark, CircleDollarSign, Route, Mail, Save, FileCheck, XCircle, ArrowRight, BookOpen, Send, ShieldAlert, Award, FileSpreadsheet, Paperclip, FolderOpen } from 'lucide-react';"
  );
}

// Reemplazos de emojis
const replacements = {
  '📄': '<FileText size={16} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📋': '<FileCheck size={16} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📂': '<FolderOpen size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '⏳': '<Clock size={16} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '⏱️': '<Clock size={12} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📤': '<Send size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📥': '<Download size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📎': '<Paperclip size={12} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '✏️': '<Edit3 size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '🗑️': '<Trash2 size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '🗑': '<Trash2 size={12} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '🪪': '<User size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📚': '<BookOpen size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '🏛': '<Landmark size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📧': '<Mail size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '👥': '<User size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📅': '<Clock size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📰': '<FileText size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '✅': '<CheckCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '❌': '<XCircle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '⚡': '<AlertTriangle size={16} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📨': '<Mail size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '➡️': '<ArrowRight size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '🔴': '<XCircle size={24} color="#dc2626"/>',
  '🟡': '<AlertTriangle size={24} color="#d97706"/>',
  '🟢': '<CheckCircle size={24} color="#15803d"/>',
  '🔗': '<Paperclip size={12} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '📬': '<Download size={16} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '⚠️': '<ShieldAlert size={16} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '⭐': '<Award size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '💡': '<AlertTriangle size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '👤': '<User size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
  '💾': '<Save size={14} style={{display:"inline-block", verticalAlign:"middle"}}/>',
};

// Iterar y reemplazar
for (const [emoji, comp] of Object.entries(replacements)) {
  const regex = new RegExp(emoji, 'g');
  content = content.replace(regex, `<span style={{display:"inline-flex", alignItems:"center", gap: 6}}>${comp}</span>`);
}

fs.writeFileSync(file, content, 'utf8');
console.log('DetalleSolicitud.jsx limpiado con éxito.');
