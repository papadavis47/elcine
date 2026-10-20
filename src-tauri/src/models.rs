use std::str::FromStr;

use serde::{Deserialize, Serialize};

/// Physical/digital format of an owned copy. Serde spellings match what the
/// frontend sends and what's stored in the `format` column, so an unknown
/// value is rejected when the IPC payload deserializes.
#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq)]
pub enum Format {
    #[serde(rename = "DVD")]
    Dvd,
    Digital,
    #[serde(rename = "Blu-ray")]
    BluRay,
}

impl Format {
    pub fn as_str(self) -> &'static str {
        match self {
            Format::Dvd => "DVD",
            Format::Digital => "Digital",
            Format::BluRay => "Blu-ray",
        }
    }
}

impl FromStr for Format {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "DVD" => Ok(Format::Dvd),
            "Digital" => Ok(Format::Digital),
            "Blu-ray" => Ok(Format::BluRay),
            other => Err(format!("Invalid format: {other:?}")),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Movie {
    pub id: i64,
    pub title: String,
    pub director: String,
    pub notes: Option<String>,
    pub is_favorite: bool,
    pub format: Format,
    pub tmdb_id: Option<i64>,
    pub poster_path: Option<String>,
    pub created_at: String,
    pub release_year: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMovie {
    pub title: String,
    pub director: Option<String>,
    pub notes: Option<String>,
    pub is_favorite: bool,
    pub format: Format,
    pub release_year: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateMovie {
    pub id: i64,
    pub title: String,
    pub director: String,
    pub notes: Option<String>,
    pub is_favorite: bool,
    pub format: Format,
    pub release_year: Option<i64>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_json(format: &str) -> String {
        format!(r#"{{"title":"Stalker","is_favorite":false,"format":"{format}"}}"#)
    }

    #[test]
    fn accepts_each_known_format() {
        for (raw, expected) in [
            ("DVD", Format::Dvd),
            ("Digital", Format::Digital),
            ("Blu-ray", Format::BluRay),
        ] {
            let movie: CreateMovie = serde_json::from_str(&create_json(raw)).unwrap();
            assert_eq!(movie.format, expected);
            assert_eq!(movie.format.as_str(), raw);
            assert_eq!(raw.parse::<Format>(), Ok(expected));
        }
    }

    #[test]
    fn rejects_unknown_format_at_the_ipc_boundary() {
        for bad in ["VHS", "dvd", "Bluray", ""] {
            assert!(
                serde_json::from_str::<CreateMovie>(&create_json(bad)).is_err(),
                "{bad:?} should not deserialize"
            );
            assert!(bad.parse::<Format>().is_err());
        }
    }

    #[test]
    fn serializes_to_the_db_spelling() {
        assert_eq!(serde_json::to_string(&Format::BluRay).unwrap(), r#""Blu-ray""#);
    }
}
