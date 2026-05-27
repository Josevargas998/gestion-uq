import os
path = "src/components/DetalleSolicitud.jsx"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# 1. Add import DatosProductoPanel
for i, line in enumerate(lines):
    if "import Decreto1279Panel" in line:
        lines.insert(i + 1, "import DatosProductoPanel from './DatosProductoPanel.jsx';\n")
        break

# 2. Add datosProd state
for i, line in enumerate(lines):
    if "const [actaCiarp, setActaCiarp]" in line:
        lines.insert(i + 1, """  const [datosProd, setDatosProd] = React.useState(() => {
    try { return typeof sol.datos_prod === 'string' ? JSON.parse(sol.datos_prod) : (sol.datos_prod || {}); } catch { return {}; }
  });\n""")
        break

# 3. Add datos_prod to avanzar
for i, line in enumerate(lines):
    if "etapa: nuevaEtapa," in line:
        lines.insert(i, "      datos_prod: datosProd,\n")
        break

# 4. Add datos_prod to handleGuardarPuntaje
for i, line in enumerate(lines):
    if "acta_ciarp: actaCiarp," in line and "pts_asig:" in lines[i-1]:
        lines.insert(i + 1, "      datos_prod: datosProd,\n")
        break

# 5. Insert DatosProductoPanel rendering
for i, line in enumerate(lines):
    if "{/* PANELES DE EDICIÓN DE PUNTAJE Y AVANCE */}" in line:
        # Find the div card
        for j in range(i, i+5):
            if '<div className="card"' in lines[j] and 'var(--info)' in lines[j]:
                # Wrap in <>
                lines[j-1] = lines[j-1].replace(" && (", " && (\n        <>\n          <DatosProductoPanel \n            tipo={sol.tipo} \n            datos={datosProd} \n            onChange={(nuevosDatos) => { setDatosProd(nuevosDatos); setSaved(false); }} \n          />")
                
                # Now find where the closing brace is. It's the matching closing brace for the condition.
                for k in range(j+1, len(lines)):
                    if "      )}" in lines[k] and "        </div>" in lines[k-1] and "      {sol.etapa === 'ciarp'" in lines[k+2]:
                        lines.insert(k, "        </>\n")
                        break
                break
        break

with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)
