"use client";

import { useEffect } from "react";

export function EconomyHubClient() {
  useEffect(() => {
    const handleSubmit = (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement) || !form.classList.contains("economy-command-form")) return;
      if (form.dataset.operationCommitted === "true") return;

      event.preventDefault();
      form.dataset.operationCommitted = "true";
      form.dataset.operationState = "running";

      const button = event.submitter instanceof HTMLButtonElement ? event.submitter : form.querySelector("button[type='submit']");
      if (button) {
        button.dataset.originalLabel = button.textContent || "";
        button.textContent = "Operation in progress";
        button.disabled = true;
      }

      const panel = form.closest(".economy-action-card, .economy-location-card, .inventory-card, .economy-command-panel");
      panel?.classList.add("economy-operation-active");

      window.setTimeout(() => {
        if (form.requestSubmit && button) {
          form.requestSubmit(button);
        } else {
          form.submit();
        }
      }, 720);
    };

    document.addEventListener("submit", handleSubmit, true);
    return () => document.removeEventListener("submit", handleSubmit, true);
  }, []);

  return null;
}
