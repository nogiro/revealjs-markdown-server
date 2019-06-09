module Main exposing (main)

import Browser
import Html exposing (Html, button, div, text)
import Html.Events exposing (onClick)
import Json.Decode

main =
  Browser.element { init = init, update = update, view = view, subscriptions = subscriptions }

-- MODEL

type alias Model =
  { init: Int }

modelDecoder : Json.Decode.Decoder Model
modelDecoder =
  Json.Decode.map Model
    (Json.Decode.field "init" Json.Decode.int)

init : String -> ( Model, Cmd msg )
init flags =
  case (Json.Decode.decodeString modelDecoder flags) of
    Ok a ->
      ( a , Cmd.none )

    Err _ ->
      ( { init = 0 } , Cmd.none )

-- UPDATE

type Msg = Increment | Decrement

update : Msg -> Model -> ( Model, Cmd msg )
update msg model =
  case msg of
    Increment ->
      ({ init = model.init + 1 }, Cmd.none )

    Decrement ->
      ({ init = model.init - 1 }, Cmd.none )


-- VIEW

view : Model -> Html Msg
view model =
  div []
    [ button [ onClick Decrement ] [ text "-" ]
    , div [] [ text (String.fromInt model.init) ]
    , button [ onClick Increment ] [ text "+" ]
    ]

subscriptions : Model -> Sub Msg
subscriptions model =
    Sub.none

