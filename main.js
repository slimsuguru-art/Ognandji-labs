import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// --- Connexion Supabase (projet Ognandji Labs) -----------------------
const supabase = createClient(
  'https://ntvkdoacmiigohhkimcs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dmtkb2FjbWlpZ29oaGtpbWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNjcxNTYsImV4cCI6MjEwMTk0MzE1Nn0.2OAczo_y16AkFdwt9izR75OO-Qx6gfmazYTXbkqybMY'
);

const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle?.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  document.body.classList.toggle('menu-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    document.body.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// --- Formulaire "Démarrer un projet" ---------------------------------
// Validation 100% côté navigateur pour l'instant. Le point de branchement
// vers Supabase (insert + notification email) est indiqué dans
// handleProjectFormSubmit() ci-dessous.
const projectForm = document.getElementById('projectForm');

if (projectForm) {
  const fields = {
    nom: { el: document.getElementById('nom'), validate: v => v.trim().length > 0 || 'Merci de renseigner votre nom.' },
    email: {
      el: document.getElementById('email'),
      validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) || 'Merci de renseigner un email valide.'
    },
    telephone: {
      el: document.getElementById('telephone'),
      validate: v => v.trim() === '' || /^[+\d][\d\s.-]{6,}$/.test(v.trim()) || 'Merci de renseigner un numéro valide.'
    },
    type_projet: { el: document.getElementById('type_projet'), validate: v => v.trim().length > 0 || 'Merci de choisir un type de projet.' },
    description: {
      el: document.getElementById('description'),
      validate: v => v.trim().length >= 20 || 'Merci de détailler un peu plus votre besoin (20 caractères minimum).'
    }
  };

  const setFieldError = (name, message) => {
    const { el } = fields[name];
    const errorEl = document.getElementById(`err-${name}`);
    if (message) {
      el.setAttribute('aria-invalid', 'true');
      if (errorEl) errorEl.textContent = message;
    } else {
      el.removeAttribute('aria-invalid');
      if (errorEl) errorEl.textContent = '';
    }
  };

  const validateField = (name) => {
    const { el, validate } = fields[name];
    const result = validate(el.value);
    setFieldError(name, result === true ? '' : result);
    return result === true;
  };

  Object.keys(fields).forEach(name => {
    const { el } = fields[name];
    el.addEventListener('blur', () => validateField(name));
    el.addEventListener('input', () => {
      if (el.getAttribute('aria-invalid') === 'true') validateField(name);
    });
  });

  const buildMailtoLink = (data) => {
    const subject = `Demande de projet — ${data.nom}`;
    const lines = [
      `Nom : ${data.nom}`,
      `Email : ${data.email}`,
      data.entreprise ? `Entreprise : ${data.entreprise}` : null,
      data.telephone ? `Téléphone : ${data.telephone}` : null,
      `Type de projet : ${data.type_projet}`,
      `Budget indicatif : ${data.budget || 'Non précisé'}`,
      `Délai souhaité : ${data.delai}`,
      '',
      'Description du besoin :',
      data.description
    ].filter(Boolean);
    const body = lines.join('\n');
    return `mailto:contact@ognandjilabs.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // TODO (prochaine étape) : notification email automatique à chaque
  // nouvelle ligne insérée, via une Edge Function Supabase déclenchée par
  // un Database Webhook sur la table demandes_projet (service email : Resend
  // à confirmer). Pour l'instant, seul l'enregistrement en base est actif.
  const handleProjectFormSubmit = async (data) => {
    const { error } = await supabase.from('demandes_projet').insert([{
      nom: data.nom,
      email: data.email,
      entreprise: data.entreprise || null,
      telephone: data.telephone || null,
      type_projet: data.type_projet,
      budget: data.budget || null,
      delai: data.delai || null,
      description: data.description
    }]);

    if (error) {
      console.error('Erreur Supabase :', error);
      // Repli : si l'enregistrement échoue (ex. hors ligne), on ouvre
      // quand même le client email pour ne pas perdre la demande.
      window.location.href = buildMailtoLink(data);
      return { ok: false };
    }
    return { ok: true };
  };

  const submitButton = projectForm.querySelector('button[type="submit"]');

  projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isValid = Object.keys(fields).every(name => validateField(name));
    if (!isValid) {
      const firstInvalid = projectForm.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    const formData = new FormData(projectForm);
    const data = Object.fromEntries(formData.entries());

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Envoi en cours...';
    }

    const result = await handleProjectFormSubmit(data);

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Envoyer ma demande <span>↗</span>';
    }

    const successEl = document.getElementById('formSuccess');
    if (successEl) {
      successEl.textContent = result.ok
        ? 'Merci ! Votre demande a bien été envoyée. Je reviens vers vous rapidement.'
        : "Un souci est survenu lors de l'enregistrement — votre client email s'est ouvert avec votre demande pré-remplie, pensez à l'envoyer.";
      successEl.hidden = false;
    }

    if (result.ok) projectForm.reset();
  });
}
