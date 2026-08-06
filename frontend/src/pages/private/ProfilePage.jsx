import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateProfile, changePassword } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import Input from "../../components/Input";
import Button from "../../components/Button";

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
    <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account details.</p>
      </div>

      <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Update Name</h2>
        {nameErr && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {nameErr}
          </div>
        )}
        {nameSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
            {nameSuccess}
          </div>
        )}
        <form onSubmit={handleNameSubmit}>
          <Input
            type="text"
            name="name"
            label="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Your name"
          />
          <Button type="submit" disabled={nameSubmitting}>
            {nameSubmitting ? "Saving..." : "Save Name"}
          </Button>
        </form>
      </div>

      <div className="border border-gray-200 rounded-xl p-6 bg-white shadow-sm">
        <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
        {pwErr && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
            {pwErr}
          </div>
        )}
        {pwSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 mb-4">
            {pwSuccess}
          </div>
        )}
        <form onSubmit={handlePasswordSubmit}>
          <Input
            type="password"
            name="currentPassword"
            label="Current Password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            type="password"
            name="newPassword"
            label="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button type="submit" disabled={pwSubmitting}>
            {pwSubmitting ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </div>
      
    </div>
  );
}