// Validation utilities for the application

export function validateBotName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Bot name is required";
  }
  if (name.length < 3) {
    return "Bot name must be at least 3 characters";
  }
  if (name.length > 50) {
    return "Bot name must be less than 50 characters";
  }
  return null;
}

export function validateKnowledgeBaseName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Knowledge base name is required";
  }
  if (name.length < 3) {
    return "Knowledge base name must be at least 3 characters";
  }
  if (name.length > 50) {
    return "Knowledge base name must be less than 50 characters";
  }
  return null;
}

export function validateGroupName(name: string): string | null {
  if (!name || name.trim().length === 0) {
    return "Group name is required";
  }
  if (name.length < 3) {
    return "Group name must be at least 3 characters";
  }
  if (name.length > 50) {
    return "Group name must be less than 50 characters";
  }
  return null;
}

export function validateMessage(message: string): string | null {
  if (!message || message.trim().length === 0) {
    return "Message cannot be empty";
  }
  if (message.length > 4000) {
    return "Message is too long (max 4000 characters)";
  }
  return null;
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}
