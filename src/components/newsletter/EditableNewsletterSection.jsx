import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function EditableNewsletterSection({ 
  newsletterId, 
  fieldName, 
  value, 
  title,
  type = "text", // text, textarea, array
  onUpdate 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = async () => {
    try {
      await base44.entities.Newsletter.update(newsletterId, {
        [fieldName]: editValue
      });
      toast.success("Updated successfully!");
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      toast.error("Failed to save changes");
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (type === "array") {
    const arrayValue = Array.isArray(editValue) ? editValue : [];
    
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="w-3 h-3" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSave}>
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        {isEditing ? (
          <div className="space-y-2">
            {arrayValue.map((item, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={item}
                  onChange={(e) => {
                    const newArray = [...arrayValue];
                    newArray[idx] = e.target.value;
                    setEditValue(newArray);
                  }}
                  className="text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newArray = arrayValue.filter((_, i) => i !== idx);
                    setEditValue(newArray);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditValue([...arrayValue, ""])}
            >
              Add Item
            </Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {arrayValue.map((item, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span className="text-slate-700">{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {!isEditing ? (
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="w-3 h-3" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleSave}>
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
        {isEditing ? (
          <Textarea
            value={editValue || ""}
            onChange={(e) => setEditValue(e.target.value)}
            rows={6}
            className="text-sm"
          />
        ) : (
          <p className="text-slate-700 leading-relaxed">{value}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-slate-900 text-sm uppercase tracking-wide">{title}</h3>
        {!isEditing ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-3 h-3" />
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleSave}>
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
      {isEditing ? (
        <Input
          value={editValue || ""}
          onChange={(e) => setEditValue(e.target.value)}
          className="text-sm"
        />
      ) : (
        <p className="text-slate-800 font-medium leading-relaxed">{value}</p>
      )}
    </div>
  );
}