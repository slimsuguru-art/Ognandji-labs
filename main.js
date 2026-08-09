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

  // TODO (étape suivante) : remplacer le contenu de cette fonction par un
  // appel Supabase, ex. :
  //   const { error } = await supabase.from('demandes_projet').insert([data]);
  // puis déclencher la notification email (Edge Function Supabase ou n8n)
  // au lieu d'ouvrir un mailto.
  const handleProjectFormSubmit = (data) => {
    window.location.href = buildMailtoLink(data);
  };

  projectForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const isValid = Object.keys(fields).every(name => validateField(name));
    if (!isValid) {
      const firstInvalid = projectForm.querySelector('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    const formData = new FormData(projectForm);
    const data = Object.fromEntries(formData.entries());

    handleProjectFormSubmit(data);

    const successEl = document.getElementById('formSuccess');
    if (successEl) successEl.hidden = false;
    projectForm.reset();
  });
}
