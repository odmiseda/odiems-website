/* js/main.js — site-wide JS for Odiems */

/* Configuration */
const conversionRate = 125.0; // KES per USD (update when needed)
const processingFeeKES = 100;  // application processing fee (KES)
const paypalClientId = "Ada-CnjQrvwMmxZUkh2Zppfyeg-Ai3VFxTacUlq5Xp8OlQK40zjmiLvJwfBTvTEZaE-Ykvju2CGyPhTI";
const paypalBusinessEmail = "denismiseda@yahoo.com";

/* Helpers */
function kesToUsd(kes) {
  return (Number(kes) / Number(conversionRate)).toFixed(2);
}
function usdToKes(usd) {
  return (Number(usd) * Number(conversionRate)).toFixed(2);
}

/* Loan calculator: 30% interest, penalty = KES 300 if late */
function calculateLoan(amountKES, isLate=false) {
  amountKES = Number(amountKES);
  if (isNaN(amountKES) || amountKES <= 0) return null;
  const interest = amountKES * 0.30;
  const penalty = isLate ? 300 : 0;
  const total = amountKES + interest + penalty;
  return { principal: amountKES, interest, penalty, total };
}
window.calculateLoan = calculateLoan;

/* Render PayPal buttons to collect the KES 100 processing fee for application */
function renderApplyPayPal() {
  const container = document.getElementById('paypalButtons');
  if (!container) return;
  document.getElementById('applyActions').style.display = 'none';
  container.style.display = 'block';
  container.innerHTML = '';

  if (!window.paypal) {
    container.innerHTML = '<p style="color:red">PayPal SDK failed to load. Try again later.</p>';
    return;
  }

  paypal.Buttons({
    createOrder: function(data, actions) {
      const usd = kesToUsd(processingFeeKES);
      return actions.order.create({
        purchase_units: [{
          amount: { value: usd },
          description: `Odiems processing fee (KES ${processingFeeKES})`
        }]
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        container.style.display = 'none';
        const success = document.getElementById('applySuccess');
        if (success) success.style.display = 'block';

        // Optional: send application details to your backend for record-keeping
        // You can POST details (e.g., name, phone, email, loan amount) here.
      });
    },
    onError: function(err) {
      container.innerHTML = '<p style="color:red">Payment failed. Try again later.</p>';
      console.error(err);
    }
  }).render('#paypalButtons');
}
window.renderApplyPayPal = renderApplyPayPal;

/* Render PayPal buttons for repayment (user-entered KES) */
function renderRepayPayPal() {
  const container = document.getElementById('paypalRepay');
  const amtInput = document.getElementById('repayKES');
  if (!container || !amtInput) return;
  const kes = Number(amtInput.value);
  if (isNaN(kes) || kes <= 0) { alert('Enter a valid KES amount'); return; }

  document.getElementById('repayForm').style.display = 'none';
  container.style.display = 'block';
  container.innerHTML = '';

  if (!window.paypal) {
    container.innerHTML = '<p style="color:red">PayPal SDK failed to load. Try again later.</p>';
    return;
  }

  const usd = kesToUsd(kes);

  paypal.Buttons({
    createOrder: function(data, actions) {
      return actions.order.create({
        purchase_units: [{
          amount: { value: usd },
          description: `Odiems loan repayment (KES ${kes})`
        }]
      });
    },
    onApprove: function(data, actions) {
      return actions.order.capture().then(function(details) {
        container.style.display = 'none';
        const success = document.getElementById('repaySuccess');
        if (success) success.style.display = 'block';
        // Optional: send payment details to backend for reconciliation
      });
    },
    onError: function(err) {
      container.innerHTML = '<p style="color:red">Payment failed. Try again later.</p>';
      console.error(err);
    }
  }).render('#paypalRepay');
}
window.renderRepayPayPal = renderRepayPayPal;

/* Load Blogger posts (best-effort; CORS may block) */
async function loadBloggerPosts() {
  const container = document.getElementById('posts');
  if (!container) return;
  try {
    const res = await fetch('https://odiemsltd.blogspot.com/feeds/posts/default?alt=json');
    const data = await res.json();
    const entries = data.feed.entry || [];
    container.innerHTML = '';
    entries.slice(0,6).forEach(e => {
      const title = e.title.$t;
      const link = e.link.find(l => l.rel === 'alternate').href;
      const snippet = (e.content ? e.content.$t.replace(/<[^>]*>/g, '').slice(0,140) : '');
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h3><a href="${link}" target="_blank">${title}</a></h3><p>${snippet}</p><p><a href="${link}" target="_blank">Read more</a></p>`;
      container.appendChild(card);
    });
    if (!entries.length) container.innerHTML = '<p>No posts found — <a href="https://odiemsltd.blogspot.com/" target="_blank">Open blog</a></p>';
  } catch (err) {
    container.innerHTML = '<p>Unable to load posts — <a href="https://odiemsltd.blogspot.com/" target="_blank">Open blog</a></p>';
  }
}
window.loadBloggerPosts = loadBloggerPosts;

/* Basic required-field validation for forms (client-side) */
document.addEventListener('submit', function(ev) {
  const form = ev.target;
  if (!(form instanceof HTMLFormElement)) return;
  const required = form.querySelectorAll('[required]');
  for (let el of required) {
    if (!el.value || (typeof el.value === 'string' && el.value.trim() === '')) {
      alert('Please fill all required fields.');
      el.focus();
      ev.preventDefault();
      return false;
    }
  }
});
