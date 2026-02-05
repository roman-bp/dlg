let debts = JSON.parse(localStorage.getItem('debts')) || [];

function save() {
  localStorage.setItem('debts', JSON.stringify(debts));
}

function addDebt() {
  const name = document.getElementById('name').value;
  const amount = Number(document.getElementById('amount').value);

  if (!name || !amount) return;

  debts.push({
    id: Date.now(),
    name,
    amount
  });

  save();
  render();
}

function render() {
  const list = document.getElementById('list');
  list.innerHTML = '';

  debts.forEach(d => {
    const li = document.createElement('li');
    li.textContent = `${d.name}: ${d.amount} грн`;
    list.appendChild(li);
  });
}

render();
