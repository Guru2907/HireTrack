import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile, changePassword } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/Input";
import Button from "../../components/Button";
import PageHeader from "../../components/PageHeader";
import Icon from "../../components/Icon";

function Notice({ tone, children }) {
  if (!children) return null;
  const styles = tone === "error" ? "border-danger/30 bg-danger-soft text-danger" : "border-success/30 bg-success-soft text-success";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`mb-5 flex items-start gap-2 rounded-[5px] border px-3 py-2.5 text-sm ${styles}`}>
      <Icon name={tone === "error" ? "alert" : "check"} className="mt-0.5 h-4 w-4 shrink-0" />
      {children}
    </div>
  );
}

function Panel({ title, description, children }) {
  return (
    <section className="grid gap-6 border-b border-line py-8 md:grid-cols-12">
      <div className="md:col-span-4">
        <h2 className="font-display text-[26px] leading-none text-ink">{title}</h2>
        <p className="mt-2 text-sm text-ink-muted">{description}</p>
      </div>
      <div className="md:col-span-8 md:max-w-md">{children}</div>
    </section>
  );
}

export default function ProfilePage() {
  const { name, token, login, logout } = useAuth();
  const navigate = useNavigate();

  const [newName, setNewName] = useState(name || "");
  const [nameErr, setNameErr] = useState("");
  const [nameSuccess, setNameSuccess] = useState("");
  const [nameSubmitting, setNameSubmitting] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    setNameErr("");
    setNameSuccess("");
    if (!newName.trim()) {
      setNameErr("Name cannot be empty");
      return;
    }
    setNameSubmitting(true);
    try {
      const res = await updateProfile({ name: newName });
      login(token, res.data.name);
      setNameSuccess("Name updated successfully.");
    } catch (err) {
      setNameErr(err.response?.data?.message || "Something went wrong");
    } finally {
      setNameSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwErr("");
    setPwSuccess("");
    setPwSubmitting(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPwSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPwErr(err.response?.data?.message || "Something went wrong");
    } finally {
      setPwSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <PageHeader eyebrow="Account" title="Profile." description="Manage your name, password and session." />

      <Panel title="Name" description="Shown in the sidebar and on your dashboard.">
        <Notice tone="error">{nameErr}</Notice>
        <Notice tone="success">{nameSuccess}</Notice>
        <form onSubmit={handleNameSubmit}>
          <Input type="text" name="name" label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Your name" autoComplete="name" />
          <Button type="submit" loading={nameSubmitting}>
            {nameSubmitting ? "Saving…" : "Save name"}
          </Button>
        </form>
      </Panel>

      <Panel title="Password" description="Use at least 6 characters. You'll stay signed in on this device.">
        <Notice tone="error">{pwErr}</Notice>
        <Notice tone="success">{pwSuccess}</Notice>
        <form onSubmit={handlePasswordSubmit}>
          <Input type="password" name="currentPassword" label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          <Input type="password" name="newPassword" label="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" />
          <Button type="submit" loading={pwSubmitting}>
            {pwSubmitting ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Panel>

      <Panel title="Session" description="Sign out of HireTrack on this device.">
        <Button variant="secondary" onClick={handleLogout}>
          <Icon name="logout" />
          Log out
        </Button>
      </Panel>
    </>
  );
}
