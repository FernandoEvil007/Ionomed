import { useEffect, useState } from "react";
import { Download, Droplets } from "lucide-react";
import { api } from "../api";
import { professionalRoles } from "../clinicalFormData";

export function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recoveryQuestion, setRecoveryQuestion] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    newPassword: "",
    securityQuestion: "",
    securityAnswer: "",
    documentId: "",
    serviceArea: "",
    professionalRole: "especialista",
    institutionName: "",
    institutionIdentifier: "",
    institutionCity: ""
  });

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    const handler = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function installApp() {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice.catch(() => null);
      setInstallPrompt(null);
      return;
    }
    setNotice("Para instalar IonoMed: abre el menú del navegador y elige Instalar app o Agregar a pantalla de inicio.");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      if (mode === "recover") {
        if (!recoveryQuestion) {
          const data = await api("/auth/recovery-question", {
            method: "POST",
            body: JSON.stringify({ email: form.email })
          });
          setRecoveryQuestion(data.question);
          setNotice("Responde la pregunta para crear una contraseña nueva.");
          return;
        }

        const data = await api("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            email: form.email,
            securityAnswer: form.securityAnswer,
            newPassword: form.newPassword
          })
        });
        setNotice(data.message || "Contraseña actualizada. Ya puedes ingresar.");
        update("password", "");
        update("newPassword", "");
        update("securityAnswer", "");
        setRecoveryQuestion("");
        setMode("login");
        return;
      }

      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const payload = mode === "login" ? { email: form.email, password: form.password } : form;
      const data = await api(path, { method: "POST", body: JSON.stringify(payload) });
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
    setRecoveryQuestion("");
  };

  const authTitle = mode === "login" ? "Ingresar" : mode === "register" ? "Registro médico" : "Recuperar contraseña";
  const authSubtitle = mode === "login"
    ? "Accede a tu institución."
    : mode === "register"
      ? "Todo usuario debe especificar su rol profesional antes de usar la aplicación."
      : "Usa tu pregunta de seguridad para crear una contraseña nueva.";

  return (
    <main className="auth-page app-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <div>
            <div className="logo" style={{ color: "white" }}>
              <div className="logo-mark"><Droplets /></div>
              <div>
                IonoMed
                <small style={{ color: "rgba(255,255,255,.78)" }}>Aplicación por Fernando Rodriguez Bayona M.D.</small>
              </div>
            </div>
            <h1>Soporte clínico para trastornos hidroelectrolíticos y gasométricos.</h1>
            <p>
              Registra pacientes y laboratorios, interpreta electrolitos y gases arteriales,
              calcula función renal y genera órdenes médicas sugeridas, específicas, editables
              y copiables.
            </p>
          </div>
          <div className="alert" style={{ background: "rgba(255,255,255,.14)", color: "white", borderColor: "rgba(255,255,255,.28)" }}>
            IonoMed no reemplaza la valoración médica. Las recomendaciones deben interpretarse según el contexto clínico, protocolos institucionales y criterio del médico tratante.
          </div>
        </div>
        <form className="auth-panel grid" onSubmit={submit}>
          <div>
            <h2>{authTitle}</h2>
            <p>{authSubtitle}</p>
          </div>
          {error && <div className="error">{error}</div>}
          {notice && <div className="success">{notice}</div>}
          {mode === "register" && (
            <>
              <label>Nombre completo<input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} required /></label>
              <div className="grid two">
                <label>Documento<input value={form.documentId} onChange={(e) => update("documentId", e.target.value)} /></label>
                <label>Rol profesional
                  <select value={form.professionalRole} onChange={(e) => update("professionalRole", e.target.value)} required>
                    {professionalRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
              <label>Servicio o área clínica<input value={form.serviceArea} onChange={(e) => update("serviceArea", e.target.value)} placeholder="Medicina interna, UCI, urgencias..." /></label>
              <div className="grid two">
                <label>Institución<input value={form.institutionName} onChange={(e) => update("institutionName", e.target.value)} required /></label>
                <label>Ciudad<input value={form.institutionCity} onChange={(e) => update("institutionCity", e.target.value)} /></label>
              </div>
              <label>Pregunta de recuperación<input value={form.securityQuestion} onChange={(e) => update("securityQuestion", e.target.value)} placeholder="Ej. ¿Cuál fue tu primer hospital?" required minLength={6} /></label>
              <label>Respuesta de seguridad<input value={form.securityAnswer} onChange={(e) => update("securityAnswer", e.target.value)} required minLength={2} /></label>
            </>
          )}
          <label>Correo electrónico<input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required /></label>
          {mode === "recover" ? (
            <>
              {recoveryQuestion && (
                <>
                  <div className="security-question"><strong>Pregunta:</strong><span>{recoveryQuestion}</span></div>
                  <label>Respuesta<input value={form.securityAnswer} onChange={(e) => update("securityAnswer", e.target.value)} required minLength={2} /></label>
                  <label>Nueva contraseña<input type="password" value={form.newPassword} onChange={(e) => update("newPassword", e.target.value)} required minLength={6} /></label>
                </>
              )}
              <button className="btn primary full" disabled={loading}>{loading ? "Procesando..." : recoveryQuestion ? "Actualizar contraseña" : "Ver pregunta"}</button>
              <button type="button" className="btn ghost full" onClick={() => switchMode("login")}>Volver al ingreso</button>
            </>
          ) : (
            <>
              <label>Contraseña<input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} required minLength={6} /></label>
              <button className="btn primary full" disabled={loading}>{loading ? "Procesando..." : mode === "login" ? "Ingresar" : "Crear cuenta"}</button>
              {mode === "login" && <button type="button" className="btn ghost full" onClick={() => switchMode("recover")}>Olvidé mi contraseña</button>}
              <button type="button" className="btn ghost full" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
                {mode === "login" ? "Crear cuenta nueva" : "Ya tengo cuenta"}
              </button>
            </>
          )}
          <button type="button" className="btn secondary full" onClick={installApp}><Download size={18} /> Instalar IonoMed</button>
        </form>
      </section>
    </main>
  );
}
