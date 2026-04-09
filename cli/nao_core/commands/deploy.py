import io
import tarfile
from pathlib import Path
from typing import Annotated

import httpx
from cyclopts import Parameter
from rich.console import Console

from nao_core.config import NaoConfig
from nao_core.tracking import track_command

console = Console()

DEFAULT_EXCLUSIONS = {
    ".git",
    "__pycache__",
    "node_modules",
    "repos",
    ".venv",
    ".env",
    "*.pyc",
}


def _load_naoignore(project_path: Path) -> set[str]:
    ignore_file = project_path / ".naoignore"
    if not ignore_file.exists():
        return set()
    patterns = set()
    for line in ignore_file.read_text().splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            patterns.add(stripped)
    return patterns


def _should_exclude(rel_path: Path, exclusions: set[str]) -> bool:
    for part in rel_path.parts:
        if part in exclusions:
            return True
    name = rel_path.name
    for pattern in exclusions:
        if pattern.startswith("*.") and name.endswith(pattern[1:]):
            return True
    return False


def _build_tarball(project_path: Path, exclusions: set[str]) -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for file_path in sorted(project_path.rglob("*")):
            if not file_path.is_file():
                continue
            rel = file_path.relative_to(project_path)
            if _should_exclude(rel, exclusions):
                continue
            tar.add(file_path, arcname=str(rel))
    buf.seek(0)
    return buf.read()


@track_command("deploy")
def deploy(
    url: Annotated[str, Parameter(help="Remote nao instance URL")],
    api_key: Annotated[str, Parameter(help="API key for authentication", name=["--api-key", "-k"])],
    path: Annotated[
        Path | None,
        Parameter(help="Project directory (defaults to current directory)", name=["--path", "-p"]),
    ] = None,
) -> None:
    """Deploy project context to a remote nao instance."""
    config = NaoConfig.try_load(path, exit_on_error=True)
    if config is None:
        return

    project_path = path or Path.cwd()
    project_name = config.project_name

    console.print(f"\n[bold]Deploying[/bold] [cyan]{project_name}[/cyan] to [cyan]{url}[/cyan]\n")

    exclusions = DEFAULT_EXCLUSIONS | _load_naoignore(project_path)

    console.print("[dim]Packaging project files...[/dim]")
    tarball = _build_tarball(project_path, exclusions)
    size_mb = len(tarball) / (1024 * 1024)
    console.print(f"[dim]Package size: {size_mb:.1f} MB[/dim]")

    deploy_url = f"{url.rstrip('/')}/api/deploy"

    console.print("[dim]Uploading...[/dim]")
    try:
        response = httpx.post(
            deploy_url,
            headers={"Authorization": f"Bearer {api_key}"},
            files={"context": ("context.tar.gz", tarball, "application/gzip")},
            timeout=120.0,
        )
    except httpx.ConnectError:
        console.print(f"\n[bold red]✗[/bold red] Could not connect to {url}")
        console.print("[dim]Check the URL and ensure the nao instance is running.[/dim]")
        return
    except httpx.TimeoutException:
        console.print("\n[bold red]✗[/bold red] Request timed out")
        return

    if response.status_code == 401:
        console.print("\n[bold red]✗[/bold red] Authentication failed. Check your API key.")
        return

    if response.status_code != 200:
        console.print(f"\n[bold red]✗[/bold red] Deploy failed ({response.status_code})")
        try:
            error = response.json().get("error", response.text)
        except Exception:
            error = response.text
        console.print(f"[red]{error}[/red]")
        return

    result = response.json()
    status = result.get("status", "unknown")
    status_color = "green" if status == "created" else "yellow"

    console.print(f"\n[bold {status_color}]✓[/bold {status_color}] Project [cyan]{project_name}[/cyan] {status}")
    console.print(f"[dim]Project ID: {result.get('projectId')}[/dim]")
