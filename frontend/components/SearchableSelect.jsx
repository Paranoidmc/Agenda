"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export default function SearchableSelect({
  name,
  value,
  options = [], // [{ value, label }]
  placeholder = "Seleziona...",
  disabled = false,
  onChange,
  maxVisible = 200,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((o) => String(o.value) === String(value)) || null,
    [options, value]
  );

  // Input text shows the label of selected option until user types
  const displayValue = selectedOption ? selectedOption.label : "";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, maxVisible);
    return options
      .filter((o) => (o.label || "").toLowerCase().includes(q))
      .slice(0, maxVisible);
  }, [options, query, maxVisible]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (opt) => {
    if (disabled) return;
    if (onChange) {
      onChange({ target: { name, value: opt?.value } });
    }
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (onChange) onChange({ target: { name, value: "" } });
    setQuery("");
  };

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        onClick={() => !disabled && setOpen((v) => !v)}
        style={{
          width: "100%",
          padding: "10px 12px",
          borderRadius: 8,
          border: "1px solid #e5e5ea",
          backgroundColor: disabled ? "#f2f2f7" : "#fff",
          cursor: disabled ? "not-allowed" : "text",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ opacity: 0.6 }}>🔍</span>
        <input
          type="text"
          placeholder={placeholder}
          disabled={disabled}
          onFocus={() => !disabled && setOpen(true)}
          value={open ? query : (displayValue || "")}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "1rem",
          }}
        />
        {(value || query) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#888",
              fontSize: 16,
            }}
            aria-label="Pulisci"
            title="Pulisci"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 20,
            background: "#fff",
            border: "1px solid #e5e5ea",
            borderTop: "none",
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8,
            maxHeight: 260,
            overflowY: "auto",
            boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: 10, color: "#666" }}>Nessun risultato</div>
          ) : (
            filtered.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <div
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    background: isSelected ? "rgba(0,122,255,0.08)" : "#fff",
                    color: isSelected ? "var(--primary)" : "#333",
                  }}
                >
                  {opt.label}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
