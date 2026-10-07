
function showPage(pageId) {
  const pages = document.querySelectorAll(".page");
  const links = document.querySelectorAll("[data-page-link]");

  pages.forEach(page => page.classList.toggle("active-page", page.id === pageId));
  links.forEach(link => link.classList.toggle("active", link.dataset.pageLink === pageId));

  const nav = document.getElementById("mainNav");
  const menuButton = document.getElementById("menuButton");
  nav.classList.remove("open");
  menuButton.setAttribute("aria-expanded", "false");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page-link]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    const pageId = link.dataset.pageLink;
    history.replaceState(null, "", "#" + pageId);
    showPage(pageId);
  });
});

document.getElementById("menuButton").addEventListener("click", () => {
  const nav = document.getElementById("mainNav");
  const open = nav.classList.toggle("open");
  document.getElementById("menuButton").setAttribute("aria-expanded", String(open));
});

const initialPage = location.hash.replace("#", "");
showPage(["home", "about", "analysis", "contact"].includes(initialPage) ? initialPage : "home");

document.getElementById("year").textContent = new Date().getFullYear();

function numberFrom(id) {
  return Number(document.getElementById(id).value);
}

function setResult(id, message, isError = false) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.classList.remove("success", "error");
  el.classList.add(isError ? "error" : "success");
}

function parseSeries(id) {
  const raw = document.getElementById(id).value;
  const values = raw
    .split(",")
    .map(v => v.trim())
    .filter(v => v !== "")
    .map(Number);

  if (values.length < 2 || values.some(v => !Number.isFinite(v))) {
    throw new Error("Enter at least two valid numbers separated by commas.");
  }
  return values;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sumCrossDeviations(x, y) {
  const mx = mean(x);
  const my = mean(y);
  return x.reduce((sum, value, i) => sum + (value - mx) * (y[i] - my), 0);
}

function sumSquaredDeviations(values) {
  const m = mean(values);
  return values.reduce((sum, value) => sum + Math.pow(value - m, 2), 0);
}

function calculateHPR() {
  const beginning = numberFrom("hprBegin");
  const ending = numberFrom("hprEnd");
  const dividends = numberFrom("hprDividend");

  if (![beginning, ending, dividends].every(Number.isFinite)) {
    return setResult("hprResult", "Please enter valid numbers in all fields.", true);
  }
  if (beginning <= 0) {
    return setResult("hprResult", "Beginning price must be greater than zero.", true);
  }

  const hpr = (ending - beginning + dividends) / beginning;
  setResult("hprResult", `Holding-Period Return: ${(hpr * 100).toFixed(2)}%`);
}

function calculateAnnualized() {
  const hprPercent = numberFrom("annualHpr");
  const days = numberFrom("annualDays");

  if (![hprPercent, days].every(Number.isFinite)) {
    return setResult("annualResult", "Please enter valid numbers in all fields.", true);
  }
  if (days <= 0) {
    return setResult("annualResult", "Days held must be greater than zero.", true);
  }

  const hpr = hprPercent / 100;
  if (hpr <= -1) {
    return setResult("annualResult", "Holding-period return must be greater than -100%.", true);
  }

  const annualized = Math.pow(1 + hpr, 365 / days) - 1;
  setResult("annualResult", `Annualized Return: ${(annualized * 100).toFixed(2)}%`);
}

function calculateBeta() {
  try {
    const stock = parseSeries("betaStock");
    const market = parseSeries("betaMarket");

    if (stock.length !== market.length) {
      return setResult("betaResult", "Stock and market return series must have the same number of observations.", true);
    }

    const marketSS = sumSquaredDeviations(market);
    if (marketSS === 0) {
      return setResult("betaResult", "Market returns must vary. Beta is undefined when market variance is zero.", true);
    }

    // The n or n-1 denominator cancels because beta is covariance divided by variance.
    const beta = sumCrossDeviations(stock, market) / marketSS;
    setResult("betaResult", `Beta: ${beta.toFixed(4)}`);
  } catch (error) {
    setResult("betaResult", error.message, true);
  }
}

function calculateSharpe() {
  const portfolioReturn = numberFrom("sharpeReturn");
  const riskFree = numberFrom("sharpeRf");
  const volatility = numberFrom("sharpeVol");

  if (![portfolioReturn, riskFree, volatility].every(Number.isFinite)) {
    return setResult("sharpeResult", "Please enter valid numbers in all fields.", true);
  }
  if (volatility <= 0) {
    return setResult("sharpeResult", "Volatility must be greater than zero.", true);
  }

  // All three inputs are in percentage units, so the common /100 scaling cancels in the ratio.
  const sharpe = (portfolioReturn - riskFree) / volatility;
  setResult("sharpeResult", `Sharpe Ratio: ${sharpe.toFixed(4)}`);
}

function calculateCorrelation() {
  try {
    const a = parseSeries("corrA");
    const b = parseSeries("corrB");

    if (a.length !== b.length) {
      return setResult("corrResult", "Asset return series must have the same number of observations.", true);
    }

    const ssA = sumSquaredDeviations(a);
    const ssB = sumSquaredDeviations(b);

    if (ssA === 0 || ssB === 0) {
      return setResult("corrResult", "Both assets must have varying returns for correlation to be defined.", true);
    }

    const correlation = sumCrossDeviations(a, b) / Math.sqrt(ssA * ssB);
    const safeCorrelation = Math.max(-1, Math.min(1, correlation));
    setResult("corrResult", `Correlation: ${safeCorrelation.toFixed(4)}`);
  } catch (error) {
    setResult("corrResult", error.message, true);
  }
}
